from fastapi import APIRouter, Depends, HTTPException, status
from app.models import WorkspaceCreate, WorkspaceOut
from app.dependencies import get_current_user
from app.db.supabase_client import get_supabase

router = APIRouter()


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


@router.post("", response_model=WorkspaceOut)
async def create_workspace(body: WorkspaceCreate, user=Depends(get_current_user)):
    db = get_supabase()
    ws = db.table("workspaces").insert({"name": body.name, "owner_id": user["id"]}).execute()
    ws_id = ws.data[0]["id"]
    db.table("workspace_members").insert({
        "workspace_id": ws_id,
        "user_id": user["id"],
        "role": "owner",
    }).execute()
    return ws.data[0]


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(user=Depends(get_current_user)):
    db = get_supabase()
    member_rows = (
        db.table("workspace_members")
        .select("workspace_id")
        .eq("user_id", user["id"])
        .execute()
    )
    ids = [r["workspace_id"] for r in member_rows.data]
    if not ids:
        return []
    result = db.table("workspaces").select("*").in_("id", ids).execute()
    return result.data


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(workspace_id: str, user=Depends(get_current_user)):
    _assert_member(workspace_id, user["id"])
    db = get_supabase()
    result = db.table("workspaces").select("*").eq("id", workspace_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return result.data[0]


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: str, user=Depends(get_current_user)):
    role = _assert_member(workspace_id, user["id"])
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete workspace")
    db = get_supabase()
    db.table("workspaces").delete().eq("id", workspace_id).execute()
