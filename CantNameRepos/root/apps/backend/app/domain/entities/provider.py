from pydantic import BaseModel
from app.domain.enums.care_setting import CareSetting


class Provider(BaseModel):
    id: str
    name: str
    care_setting: CareSetting
    specialty: str
    address: str
    city: str
    state: str
    zip_code: str
    latitude: float
    longitude: float
    networks: list[str]
