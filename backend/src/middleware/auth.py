from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
import logging

security = HTTPBearer()
logger = logging.getLogger(__name__)

def get_public_key():
    # Helper to get public key payload
    key_path = os.getenv("CASDOOR_PUBLIC_KEY_PATH")
    if key_path and os.path.exists(key_path):
        with open(key_path, "r") as f:
            return f.read()
    
    key_content = os.getenv("CASDOOR_PUBLIC_KEY")
    if key_content:
        return key_content
        
    return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT and return user info"""
    token = credentials.credentials
    public_key = get_public_key()
    
    try:
        payload = {}
        if not public_key:
             logger.warning("CASDOOR_PUBLIC_KEY not found! Skipping signature verification (DEV MODE ONLY).")
             # Use get_unverified_claims to safely bypass all verification logic
             payload = jwt.get_unverified_claims(token)
        else:
             payload = jwt.decode(token, public_key, algorithms=["RS256"])
        
        user_id = payload.get("sub") or payload.get("id")
        username = payload.get("name")
        
        # Parse roles - Check isAdmin flag first (Casdoor-specific)
        # If isAdmin is true, user is an admin regardless of roles array
        is_admin = payload.get("isAdmin", False)
        
        role = "viewer"  # Default
        
        if is_admin:
            role = "admin"
        else:
            # Parse roles array
            roles = payload.get("roles", [])
            role_names = []
            if isinstance(roles, list):
                for r in roles:
                    if isinstance(r, dict):
                        role_names.append(r.get("name", "").lower())
                    elif isinstance(r, str):
                        role_names.append(r.lower())
            
            if "admin" in role_names:
                role = "admin"
            elif "editor" in role_names:
                role = "editor"
            elif not role_names and payload.get("owner") == "built-in":
                # Fallback: built-in org members are admins
                role = "admin"

        return {"id": user_id, "username": username, "role": role}

    except JWTError as e:
        logger.error(f"JWT Validation Error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid authentication: {str(e)}")
