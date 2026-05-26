from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from app.models import DocumentOut
from app.dependencies import get_current_user
from app.db.supabase_client import get_supabase
from app.services.document_processor import process_document

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "csv", "md"}


def _assert_member(workspace_id: str, user_id: str):
    db = get_supabase()
    result = (
        db.table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return result.data[0]["role"]


@router.post("/workspaces/{workspace_id}/documents", response_model=DocumentOut)
async def upload_document(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    _assert_member(workspace_id, user["id"])

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    db = get_supabase()

    from uuid import uuid4
    storage_path = f"{workspace_id}/{uuid4()}/{file.filename}"
    db.storage.from_("documents").upload(
        storage_path,
        content,
        {"content-type": file.content_type or "application/octet-stream"},
    )
    public_url = db.storage.from_("documents").get_public_url(storage_path)

    doc = db.table("documents").insert({
        "workspace_id": workspace_id,
        "file_name": file.filename,
        "file_type": ext,
        "file_url": public_url,
        "status": "processing",
    }).execute()

    doc_id = doc.data[0]["id"]
    background_tasks.add_task(process_document, doc_id, ext, content)

    return doc.data[0]


@router.get("/workspaces/{workspace_id}/documents", response_model=list[DocumentOut])
async def list_documents(workspace_id: str, user=Depends(get_current_user)):
    _assert_member(workspace_id, user["id"])
    db = get_supabase()
    result = (
        db.table("documents")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    doc = db.table("documents").select("workspace_id").eq("id", document_id).execute()
    if not doc.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    role = _assert_member(doc.data[0]["workspace_id"], user["id"])
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    db.table("documents").delete().eq("id", document_id).execute()
