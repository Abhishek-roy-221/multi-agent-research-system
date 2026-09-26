from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tools import web_search , scrape_url
from dotenv import load_dotenv
load_dotenv()


llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",temprature=0
)

# 1st agent - search
def build_search_agent():
    return create_agent(
        model = llm,
        tools=[web_search]
    )

# 2nd agent - reader
def build_search_agent():
    return create_agent(
        model = llm,
        tools=[scrape_url]
    )