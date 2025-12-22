import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { environment } from "../Config/environment";

const client = jwksClient({
  jwksUri: `https://${environment.auth0.domain}/.well-known/jwks.json`,
});

/**
 * Gets the signing key for a given kid
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);
      return;
    }

    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export interface AuthenticatedUser extends JwtPayload {
  permissions?: string[];
}

/**
 * Validate JWT from Authorization header and optionally enforce permissions.
 */
export async function requireAuth(
  req: HttpRequest,
  context: InvocationContext,
  requiredPermissions: string[] = []
): Promise<AuthenticatedUser | HttpResponseInit> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    context.log("❌ Missing or invalid Authorization header");
    return {
      status: 401,
      jsonBody: { error: "Unauthorized", message: "Missing bearer token" },
    };
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = await new Promise<AuthenticatedUser>((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: environment.auth0.audience,
          issuer: `https://${environment.auth0.domain}/`,
          algorithms: ["RS256"],
        },
        (err, decodedToken) => {
          if (err || !decodedToken) {
            reject(err || new Error("Token verification failed"));
          } else {
            resolve(decodedToken as AuthenticatedUser);
          }
        }
      );
    });

    // Check permissions (Auth0 RBAC)
    if (requiredPermissions.length > 0) {
      const perms = decoded.permissions || [];
      const missing = requiredPermissions.filter((p) => !perms.includes(p));

      if (missing.length > 0) {
        context.log("❌ Missing required permissions:", missing);
        return {
          status: 403,
          jsonBody: { error: "Forbidden", message: "Insufficient permissions" },
        };
      }
    }

    return decoded;
  } catch (err: any) {
    context.log("❌ Token verification error:", err.message || err);
    return {
      status: 401,
      jsonBody: { error: "Unauthorized", message: "Invalid token" },
    };
  }
}
