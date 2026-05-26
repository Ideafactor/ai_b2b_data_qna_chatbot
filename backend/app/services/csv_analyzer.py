import io
import re
import json
import pandas as pd
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_experimental.tools import PythonAstREPLTool
from langchain_core.prompts import ChatPromptTemplate


def analyze_csv(question: str, csv_bytes: bytes, columns: list[dict]) -> dict:
    """
    Returns {"answer": str, "chart_config": dict | None, "columns_used": list[str]}
    """
    df = pd.read_csv(io.BytesIO(csv_bytes))
    column_info = ", ".join([f"{c['name']} ({c['dtype']})" for c in columns])

    repl_tool = PythonAstREPLTool(locals={"df": df.copy(), "pd": pd})

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are a data analyst. The user has a pandas DataFrame called `df`.
Columns: {column_info}

Analyze the data and answer the user's question.
- Use print() for all output
- Do NOT use plt.show() or display()
- If a chart would help visualize the answer, output a JSON block in this exact format after your text answer:
```chart
{{"chart_type": "bar|line|pie|table|histogram", "title": "...", "x_label": "column_name", "y_label": "column_name", "data": [{{"key": "value"}}]}}
```
- For pie charts use keys "label" and "value" in data objects
- Keep data arrays under 50 items""",
        ),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_openai_tools_agent(llm, [repl_tool], prompt)
    executor = AgentExecutor(agent=agent, tools=[repl_tool], verbose=False, max_iterations=6)

    result = executor.invoke({"input": question})
    raw_output: str = result.get("output", "")

    chart_config = None
    chart_match = re.search(r"```chart\n(.*?)\n```", raw_output, re.DOTALL)
    if chart_match:
        try:
            chart_config = json.loads(chart_match.group(1))
            raw_output = raw_output.replace(chart_match.group(0), "").strip()
        except json.JSONDecodeError:
            pass

    return {
        "answer": raw_output,
        "chart_config": chart_config,
        "columns_used": list(df.columns),
    }
