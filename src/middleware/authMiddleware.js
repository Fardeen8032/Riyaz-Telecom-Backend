import AppError from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return next(new AppError("Authorization header is required", 401));
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new AppError("Invalid authorization format. Use Bearer token", 401)
    );
  }

  try {
    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    return next(new AppError("Invalid or expired access token", 401));
  }
};

export default authMiddleware;