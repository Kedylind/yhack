from enum import Enum


class CareSetting(str, Enum):
    TELEDERM = "telederm"
    PCP = "pcp"
    DERMATOLOGY = "dermatology"
    URGENT_CARE = "urgent_care"
    COSMETIC_DERM = "cosmetic_derm"
