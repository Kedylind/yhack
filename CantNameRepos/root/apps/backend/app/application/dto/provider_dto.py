from pydantic import BaseModel
from app.domain.enums.care_setting import CareSetting


class ProviderDTO(BaseModel):
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


class ProviderListResponseDTO(BaseModel):
    providers: list[ProviderDTO]
