import json
import os

from dotenv import load_dotenv
from deepeval.models import AzureOpenAIModel
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    HallucinationMetric,
    ExactMatchMetric
)

load_dotenv()

# Azure OpenAI model
model = AzureOpenAIModel(
    model="gpt-4.1",
    deployment_name=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
)

# Load evaluation data
with open("rag_evaluation/eval_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Metrics
answer_relevancy = AnswerRelevancyMetric(
    threshold=0.7,
    model=model
)

faithfulness = FaithfulnessMetric(
    threshold=0.7,
    model=model
)

context_precision = ContextualPrecisionMetric(
    threshold=0.7,
    model=model
)

context_recall = ContextualRecallMetric(
    threshold=0.7,
    model=model
)

context_relevancy = ContextualRelevancyMetric(
    threshold=0.7,
    model=model
)



exact_match = ExactMatchMetric()

# Store results
results = []

for item in data:

    test_case = LLMTestCase(
        input=item["question"],
        actual_output=item["answer"],
        expected_output=item["ground_truth"],
        retrieval_context=item["contexts"]
    )

    answer_relevancy.measure(test_case)
    faithfulness.measure(test_case)
    context_precision.measure(test_case)
    context_recall.measure(test_case)
    context_relevancy.measure(test_case)
    exact_match.measure(test_case)

    result = {
        "question": item["question"],
        "answer": item["answer"],
        "ground_truth": item["ground_truth"],

        "answer_relevancy": {
            "score": answer_relevancy.score,
            "reason": answer_relevancy.reason
        },

        "faithfulness": {
            "score": faithfulness.score,
            "reason": faithfulness.reason
        },

        "context_precision": {
            "score": context_precision.score,
            "reason": context_precision.reason
        },

        "context_recall": {
            "score": context_recall.score,
            "reason": context_recall.reason
        },

        "context_relevancy": {
            "score": context_relevancy.score,
            "reason": context_relevancy.reason
        },

        "exact_match": {
            "score": exact_match.score
        }
    }

    results.append(result)

# Save results
output_file = "rag_evaluation/evaluation_results.json"

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4, ensure_ascii=False)

print(f"\nEvaluation completed. Results saved to {output_file}")

print("\nEvaluation completed.")