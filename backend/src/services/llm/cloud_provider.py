"""
Cloud LLM Provider
==================

Handles all cloud API LLM calls using LiteLLM for maximum flexibility.
Supports OpenAI, Anthropic, Gemini, DeepSeek, and 100+ other providers.
"""

import logging
import os
from typing import AsyncGenerator, Dict, List, Optional

import litellm

# Configure litellm to be less verbose if needed
litellm.suppress_instrumentation_warnings = True

from .exceptions import LLMAPIError, LLMAuthenticationError
from .utils import sanitize_url

logger = logging.getLogger("CloudProvider")

async def complete(
    prompt: str,
    system_prompt: str = "You are a helpful assistant.",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    api_version: Optional[str] = None,
    binding: str = "openai",
    messages: Optional[List[Dict[str, str]]] = None,
    **kwargs,
) -> str:
    """
    Complete a prompt using LiteLLM.
    """
    # preparing arguments
    model = model or os.getenv("LLM_MODEL")
    api_key = api_key or os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
    
    # Construct messages if not provided
    if not messages:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

    # Filter out None values for optional params
    call_kwargs = {k: v for k, v in kwargs.items() if v is not None}
    
    # For Gemini models, FORCE Google AI Studio (not Vertex AI)
    # Gemini API key format starts with "AIza" - use this to detect Google AI Studio
    if model and ("gemini" in model.lower()) and api_key and api_key.startswith("AIza"):
        # CRITICAL: Set custom_llm_provider to "gemini" to use Google AI Studio
        call_kwargs["custom_llm_provider"] = "gemini"
        # CRITICAL: Set vertex_project="" (empty string, not None) to disable Vertex AI
        call_kwargs["vertex_project"] = ""
        # CRITICAL: Set vertex_location="" to disable Vertex AI
        call_kwargs["vertex_location"] = ""
        logger.info(f"Forcing Google AI Studio (not Vertex AI) for model={model}")
    
    # Don't override api_base for Gemini - let LiteLLM handle it
    # if base_url:
    #     call_kwargs["api_base"] = base_url
    if api_version:
        call_kwargs["api_version"] = api_version
        
    logger.info(f"Calling LiteLLM with model={model}, api_key={'***' if api_key else None}")
    
    try:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            api_key=api_key,
            **call_kwargs
        )
        
        return response.choices[0].message.content or ""
        
    except Exception as e:
        logger.error(f"LiteLLM completion failed: {e}")
        # Re-raise as standard exception or wrap it
        raise e


async def stream(
    prompt: str,
    system_prompt: str = "You are a helpful assistant.",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    api_version: Optional[str] = None,
    binding: str = "openai",
    messages: Optional[List[Dict[str, str]]] = None,
    **kwargs,
) -> AsyncGenerator[str, None]:
    """
    Stream a response using LiteLLM.
    """
    model = model or os.getenv("LLM_MODEL")
    api_key = api_key or os.getenv("LLM_API_KEY")

    if not messages:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

    call_kwargs = {k: v for k, v in kwargs.items() if v is not None}
    
    if base_url:
        call_kwargs["api_base"] = base_url
    if api_version:
        call_kwargs["api_version"] = api_version

    try:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            api_key=api_key,
            stream=True,
            **call_kwargs
        )
        
        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content
                
    except Exception as e:
        logger.error(f"LiteLLM streaming failed: {e}")
        raise e


async def fetch_models(
    base_url: str,
    api_key: Optional[str] = None,
    binding: str = "openai",
) -> List[str]:
    """
    Fetch available models. 
    Note: LiteLLM doesn't have a unified 'list_models' for all providers yet 
    that works exactly like this, so we keep a simple implementation or stub it.
    """
    # For now, return a generic list or empty list to avoid breaking UI.
    # Implementing universal model fetching is complex.
    return [] 

__all__ = [
    "complete",
    "stream",
    "fetch_models",
]
