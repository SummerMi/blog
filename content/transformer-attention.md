---
title: Understanding Transformer Attention
date: 2024-11-26
tags: [deep-learning, nlp, transformer]
description: A deep dive into the self-attention mechanism that powers modern language models. From theory to implementation.
---

The Transformer architecture, introduced in the landmark paper "Attention Is All You Need" (2017), has revolutionized natural language processing and beyond. At its core lies the **self-attention mechanism** — a elegant solution that allows models to weigh the importance of different parts of the input when processing each element.

## Why Attention Matters

Before Transformers, sequence models like RNNs and LSTMs processed tokens sequentially. This created two major problems:

- **Long-range dependencies** — Information from early tokens had to pass through many steps to reach later ones, often getting diluted.
- **Sequential bottleneck** — Processing couldn't be parallelized, making training slow.

Attention solves both problems by allowing each token to directly attend to every other token in the sequence.

## The Math Behind Self-Attention

Self-attention operates on three matrices derived from the input: **Query (Q)**, **Key (K)**, and **Value (V)**.

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

Let's break this down:

1. **QK^T** — Compute similarity scores between all query-key pairs
2. **/ √d_k** — Scale by the square root of key dimension to prevent extreme softmax values
3. **softmax** — Normalize to get attention weights (probabilities)
4. **· V** — Weighted sum of values based on attention weights

## Implementation in Python

Here's a minimal implementation of scaled dot-product attention:

```python
import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Q, K, V: (batch, seq_len, d_k)
    """
    d_k = Q.size(-1)

    # Compute attention scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)

    # Apply mask (optional, for decoder)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)

    # Softmax to get attention weights
    attention_weights = F.softmax(scores, dim=-1)

    # Weighted sum of values
    output = torch.matmul(attention_weights, V)

    return output, attention_weights
```

## Multi-Head Attention

Instead of performing a single attention function, Transformers use **multi-head attention** — running multiple attention operations in parallel with different learned projections.

> "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions."
> — Vaswani et al., 2017

Each "head" can learn to focus on different aspects: one might capture syntactic relationships, another semantic similarities, and so on.

## Key Takeaways

- Self-attention enables direct connections between all positions in a sequence
- The Query-Key-Value framework provides a flexible way to compute relevance
- Scaling by √d_k is crucial for stable training
- Multi-head attention captures different types of relationships

Understanding attention is fundamental to working with modern AI systems. Whether you're fine-tuning LLMs, building RAG systems, or developing new architectures, these concepts form the foundation.
