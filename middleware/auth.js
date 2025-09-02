export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await req.supabase.auth.getUser(token);
    
    if (error) {
      console.log('Auth error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    console.log('Middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};