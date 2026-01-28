from functools import wraps
from fastapi import HTTPException

PERMISSIONS = {
    "admin": ["read", "write", "delete", "manage_users"],
    "editor": ["read", "write"],
    "viewer": ["read"]
}

def require_permission(permission: str):
    """
    Decorator to check user has permission.
    REQUIRES 'current_user' argument in the decorated endpoint.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            # If current_user is not found, we check if it was missing or just named differently.
            # But we strictly assume 'current_user' based on implementation plan.
            
            if current_user:
                user_role = current_user.get("role", "viewer")
                if permission not in PERMISSIONS.get(user_role, []):
                    raise HTTPException(status_code=403, detail=f"Insufficient permissions. Role '{user_role}' cannot '{permission}'.")
            else:
                # Security Fix: If current_user is missing, it means the endpoint is not properly authenticated
                # or the argument name is incorrect. We must NOT allow access.
                raise HTTPException(
                    status_code=500, 
                    detail="Server Error: Endpoint protected by require_permission must inject 'current_user' dependency."
                )
                
            return await func(*args, **kwargs)
        return wrapper
    return decorator
