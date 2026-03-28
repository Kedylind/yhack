from pydantic import BaseModel


class Plan(BaseModel):
    id: str
    insurer: str
    name: str
    network: str
    market: str = "individual"
