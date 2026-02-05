# 🚨 SECURITY INCIDENT - MongoDB Credentials Exposed

**Date:** February 5, 2026  
**Severity:** CRITICAL  
**Status:** ACTION REQUIRED

---

## What Happened

Your MongoDB Atlas credentials were exposed in the public GitHub repository in the file:
- `check-public-users.js` (line 4)

**Exposed Credentials:**
- Username: `anantharohankrovvidi_db_user`
- Password: `RohanProject`
- Cluster: `lifelinkcluster.q4gc4oi.mongodb.net`

---

## ⚠️ IMMEDIATE ACTIONS REQUIRED (DO THIS NOW!)

### 1. Rotate MongoDB Password Immediately
Your current password is compromised. Change it right now:

1. Go to: https://cloud.mongodb.com/
2. Sign in to your MongoDB Atlas account
3. Select your project (LifeLinkCluster)
4. Click **"Database Access"** in the left sidebar
5. Find user: `anantharohankrovvidi_db_user`
6. Click **"Edit"** button
7. Click **"Edit Password"**
8. Choose **"Autogenerate Secure Password"** or create a strong password (20+ characters)
9. Copy the new password
10. Click **"Update User"**

### 2. Update Your Local .env File
After changing the password in MongoDB Atlas:

1. Open: `Backend/.env`
2. Update the `MONGODB_URI` with the new password:
   ```
   MONGODB_URI=mongodb+srv://anantharohankrovvidi_db_user:NEW_PASSWORD_HERE@lifelinkcluster.q4gc4oi.mongodb.net/lifelink?retryWrites=true&w=majority&appName=LifeLinkCluster
   ```
3. Save the file

### 3. Remove Exposed Files from Git History
The file `check-public-users.js` with credentials needs to be removed from your repository:

```powershell
# Navigate to your project
cd C:\Users\Rohan\Downloads\OneDrive\Documents\CapStoneProject

# Remove the file from Git tracking (but keep local copy)
git rm --cached check-public-users.js

# Commit the removal
git commit -m "Remove file with exposed credentials"

# Push to GitHub
git push origin main
```

### 4. (Optional but Recommended) Remove from Git History
If the file was previously committed, it still exists in Git history. To completely remove it:

```powershell
# Install git-filter-repo if not already installed
# pip install git-filter-repo

# Remove file from entire history
git filter-repo --path check-public-users.js --invert-paths

# Force push to rewrite history (WARNING: This rewrites history!)
git push origin --force --all
```

**⚠️ WARNING:** Force pushing rewrites history. If others have cloned your repo, inform them to re-clone.

---

## What I've Fixed

✅ **Updated `.gitignore`** - Added patterns to prevent similar files from being committed:
   - `check-*.js`
   - `view-*.js`

✅ **Updated `check-public-users.js`** - Removed hardcoded credentials and now reads from environment variables

✅ **Verified `.env`** is properly ignored - Your `.env` file is already in `.gitignore`

---

## Security Best Practices Going Forward

### 1. Never Hardcode Credentials
❌ **NEVER DO THIS:**
```javascript
const MONGODB_URI = 'mongodb+srv://user:password@cluster...';
```

✅ **ALWAYS DO THIS:**
```javascript
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
```

### 2. Check Before Committing
Before committing to Git, always check:
```powershell
# See what will be committed
git status
git diff --cached

# Search for potential secrets
git diff --cached | findstr /i "password mongodb+srv api_key secret"
```

### 3. Use Environment Variables
All sensitive data should be in `.env` file:
- Database credentials
- API keys
- JWT secrets
- Encryption keys
- OAuth tokens

### 4. Verify .gitignore
Make sure `.env` and sensitive files are in `.gitignore`:
```ignore
.env
.env.local
.env.*.local
*.env
```

### 5. Enable MongoDB Atlas Security Features
1. **Enable Network Access Restrictions**
   - Go to: Network Access → Add IP Address
   - Restrict to your IP or use IP whitelist

2. **Enable Database Auditing**
   - Monitor for suspicious access

3. **Use Database-Specific Users**
   - Create users with minimal required permissions
   - Don't use admin users for application access

4. **Enable 2FA on MongoDB Atlas**
   - Protect your MongoDB Atlas account

---

## Verification Steps

After completing the above steps:

1. **Test your application still works:**
   ```powershell
   cd Backend
   node server.js
   ```

2. **Verify the file is not in Git:**
   ```powershell
   git status
   # check-public-users.js should not appear in "Changes to be committed"
   ```

3. **Verify .env is protected:**
   ```powershell
   git check-ignore Backend/.env
   # Should output: Backend/.env
   ```

---

## Additional Resources

- [MongoDB Atlas Security Checklist](https://www.mongodb.com/docs/atlas/security/)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Credential Management](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html)

---

## Questions?

If you encounter any issues:
1. Check that your new MongoDB password is correct in `.env`
2. Verify the connection string format is correct
3. Test the connection: `node check-public-users.js` (it should work if .env is configured)

---

**Remember:** Security is not a one-time fix. Always be vigilant about what you commit to version control!
