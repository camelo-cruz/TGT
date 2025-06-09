from inference.translation.abstract import TranslationStrategy
from inference.translation.default import DefaultTranslationStrategy


class TranslationStrategyFactory:
    @staticmethod
    def get_strategy(language_code: str) -> TranslationStrategy:
        return DefaultTranslationStrategy(language_code)
