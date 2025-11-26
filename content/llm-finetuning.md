---
title: Fine-tuning LLMs: A Practical Guide
date: 2024-11-19
tags: [llm, tutorial, fine-tuning]
description: Everything I learned about LoRA, QLoRA, and efficient fine-tuning techniques for large language models.
---

Fine-tuning large language models has become significantly more accessible thanks to parameter-efficient techniques. In this guide, I'll share practical insights from my experience fine-tuning models ranging from 7B to 70B parameters.

## Why Fine-tune?

While pre-trained models like GPT-4 or Claude are incredibly capable, fine-tuning offers several advantages:

- **Domain expertise** — Teach the model specialized knowledge
- **Style control** — Make outputs match your desired tone and format
- **Cost efficiency** — Smaller fine-tuned models can outperform larger general ones
- **Privacy** — Keep sensitive data in-house

## Full Fine-tuning vs. Parameter-Efficient Methods

The traditional approach updates all model parameters, but this requires massive compute resources. Modern techniques update only a tiny fraction of parameters while achieving similar results.

## Understanding LoRA

**Low-Rank Adaptation (LoRA)** works by freezing the pre-trained weights and injecting trainable low-rank matrices into each layer.

The key insight is that the weight updates during fine-tuning have low "intrinsic rank" — meaning they can be approximated by much smaller matrices.

> "We hypothesize that the change in weights during model adaptation also has a low 'intrinsic rank'."
> — Hu et al., LoRA paper

### Key Parameters

- `r` (rank) — Dimension of the low-rank matrices. Higher = more capacity but more memory. Start with 8-16.
- `alpha` — Scaling factor. Common practice: set to 2x rank.
- `target_modules` — Which layers to apply LoRA. Usually attention layers.

## Practical Implementation

Here's a minimal example using the `peft` library:

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

# Load base model
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    torch_dtype=torch.float16,
    device_map="auto"
)

# Configure LoRA
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Apply LoRA
model = get_peft_model(model, lora_config)
```

## Tips from Experience

1. **Data quality > quantity** — 1000 high-quality examples often beat 10000 noisy ones
2. **Start small** — Prototype with a 7B model before scaling up
3. **Learning rate matters** — Use 1e-4 to 2e-4 for LoRA
4. **Monitor loss carefully** — Overfitting happens fast with small datasets
5. **Evaluate on real tasks** — Loss alone doesn't tell the full story
