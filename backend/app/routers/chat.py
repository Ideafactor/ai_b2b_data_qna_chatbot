from fastapi import APIRouter, Depends, HTTPException, status
from app.models import SessionCreate, SessionOut, MessageCreate, MessageOut, Citation, ChartConfig
from app.dependencies import get_current_user
from app.db.supabase_client import get_supabase
from app.services.rag_service import answer_question
from app.services.chart_service import validate_chart_config

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


@router.post("/workspaces/{workspace_id}/sessions", response_model=SessionOut)
async def create_session(
    workspace_id: str,
    body: SessionCreate,
    user=Depends(get_current_user),
):
    _assert_member(workspace_id, user["id"])
    db = get_supabase()
    result = db.table("chat_sessions").insert({
        "workspace_id": workspace_id,
        "user_id": user["id"],
        "title": body.title,
    }).execute()
    return result.data[0]


@router.get("/workspaces/{workspace_id}/sessions", response_model=list[SessionOut])
async def list_sessions(workspace_id: str, user=Depends(get_current_user)):
    _assert_member(workspace_id, user["id"])
    db = get_supabase()
    result = (
        db.table("chat_sessions")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def list_messages(session_id: str, user=Depends(get_current_user)):
    db = get_supabase()
    session = db.table("chat_sessions").select("workspace_id").eq("id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _assert_member(session.data[0]["workspace_id"], user["id"])

    result = (
        db.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return [_parse_message(m) for m in result.data]


@router.post("/sessions/{session_id}/messages", response_model=MessageOut)
async def send_message(
    session_id: str,
    body: MessageCreate,
    user=Depends(get_current_user),
):
    db = get_supabase()
    session = db.table("chat_sessions").select("workspace_id").eq("id", session_id).execute()
    if not session.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    workspace_id = session.data[0]["workspace_id"]
    _assert_member(workspace_id, user["id"])

    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": body.content,
        "citations": [],
        "chart_config": None,
    }).execute()

    rag_result = answer_question(body.content, workspace_id)

    chart_config = validate_chart_config(rag_result.get("chart_config"))

    assistant_msg = db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": rag_result["answer"],
        "citations": rag_result.get("citations", []),
        "chart_config": chart_config,
    }).execute()

    return _parse_message(assistant_msg.data[0])


def _parse_message(row: dict) -> MessageOut:
    citations = [Citation(**c) for c in (row.get("citations") or [])]
    chart_raw = row.get("chart_config")
    chart = ChartConfig(**chart_raw) if chart_raw else None
    return MessageOut(
        id=row["id"],
        session_id=row["session_id"],
        role=row["role"],
        content=row["content"],
        citations=citations,
        chart_config=chart,
        created_at=row["created_at"],
    )
