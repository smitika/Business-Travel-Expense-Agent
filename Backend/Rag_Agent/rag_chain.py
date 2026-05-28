from dotenv import load_dotenv
load_dotenv()
import os
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def format_docs(docs):
    return "\n\n".join([d.page_content for d in docs])

def answer_question(index_dir: str, question: str, k: int = 4) -> str:
    embeddings = AzureOpenAIEmbeddings(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
)

    db = FAISS.load_local(index_dir, embeddings, allow_dangerous_deserialization=True)
    retriever = db.as_retriever(search_kwargs={"k": k})

    llm = llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_deployment=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
    temperature=0
)
    prompt = ChatPromptTemplate.from_template("""
You are a professional corporate travel policy assistant.

Use the provided context to answer employee travel-related questions accurately and logically.

Context:
{context}

Question:
{question}

Instructions:
- Answer clearly and concisely.
- Use the policy context to infer reasonable answers when the rule is indirectly stated.
- If the policy restricts luxury or non-standard options, apply that rule logically.
- Do not invent benefits, limits, or approvals that are not supported by the context.
- Keep answers short (2 to 5 lines).
- If the information is completely unavailable in the document, say:
  "The document does not contain this information."

Answer:
""")

    chain = (
        {"context": retriever | format_docs, "question": lambda x: x}
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain.invoke(question)