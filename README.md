# Enterprise Data Chat

기업 내부 문서와 데이터를 업로드하면 자연어로 질문하고, 근거 기반 답변과 차트를 제공하는 B2B 데이터 질의 챗봇

## 주요 기능

- **파일 업로드**: CSV, PDF, Markdown 지원
- **문서 임베딩 & 벡터 검색**: pgvector 기반 RAG 파이프라인
- **CSV 데이터 분석**: pandas를 활용한 자연어 기반 집계·통계 분석
- **근거 기반 답변**: 참조 문서명/문단, 사용 컬럼 및 집계 기준 함께 표시
- **차트 자동 생성**: Bar, Line, Pie, Histogram, Table (Plotly)
- **워크스페이스 & 권한 관리**: Owner / Admin / Member / Viewer

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Plotly |
| Backend | Python, FastAPI |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | OpenAI API, LangChain |
| File Parsing | PyMuPDF, pdfplumber |
| Auth | Supabase Auth |

## 프로젝트 구조

```
.
├── backend/
│   ├── app/
│   │   ├── routers/        # workspaces, documents, chat
│   │   ├── services/       # rag_service, csv_analyzer, chart_service, document_processor
│   │   ├── db/             # supabase_client, schema.sql
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── auth/           # login, signup
│   │   └── workspaces/     # 워크스페이스 목록, 문서 관리, 채팅
│   └── components/
├── docker-compose.yml
└── PRD.md
```

## 시작하기

### 환경 변수 설정

**backend/.env**
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

**frontend/.env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Docker로 실행

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

### 로컬 개발

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

### 테스트

```bash
cd backend
pytest
```

## DB 스키마 초기화

Supabase 프로젝트의 SQL Editor에서 `backend/app/db/schema.sql`을 실행합니다.
