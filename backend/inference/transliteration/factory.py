from inference.transliteration.abstract import TransliterationStrategy
from inference.transliteration.japanese import JapaneseStrategy

class TransliterationStrategyFactory:
    @staticmethod
    def get_strategy(language_code: str) -> TransliterationStrategy:
        if language_code == "ja":
            pass
        if language_code == "zh":
            pass
            
