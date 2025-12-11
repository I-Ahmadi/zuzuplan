# GitHub Setup Guide for ZuzuPlan

## ✅ Step 1: Local Git Repository (Already Done!)
The local Git repository has been initialized.

## Step 2: Configure Git (If Not Already Done)
If you haven't configured Git on this machine, run these commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Stage and Commit Your Files

```bash
# Add all files to staging
git add .

# Create your first commit
git commit -m "Initial commit: Add project plan and documentation"
```

## Step 4: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name:** `ZuzuPlan` (or your preferred name)
   - **Description:** "A modern, scalable task-management platform"
   - **Visibility:** Choose Public or Private
   - **⚠️ DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 5: Connect Local Repository to GitHub

After creating the repository on GitHub, you'll see a page with setup instructions. Copy the repository URL (it will look like):
- HTTPS: `https://github.com/yourusername/ZuzuPlan.git`
- SSH: `git@github.com:yourusername/ZuzuPlan.git`

Then run these commands (replace `YOUR_REPO_URL` with your actual repository URL):

### Option A: Using HTTPS (Recommended for beginners)
```bash
git remote add origin https://github.com/yourusername/ZuzuPlan.git
git branch -M main
git push -u origin main
```

### Option B: Using SSH
```bash
git remote add origin git@github.com:yourusername/ZuzuPlan.git
git branch -M main
git push -u origin main
```

## Step 6: Verify Upload

1. Refresh your GitHub repository page
2. You should see your files: `README.md`, `ZUZUPLAN.md`, and `.gitignore`

## Troubleshooting

### If you get authentication errors:
- For HTTPS: GitHub now requires a Personal Access Token instead of password
  - Go to: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate a new token with `repo` permissions
  - Use the token as your password when pushing

- For SSH: Make sure you have SSH keys set up
  - Check: `ssh -T git@github.com`
  - If not configured, follow GitHub's SSH key guide

### If you get "remote origin already exists":
```bash
git remote remove origin
git remote add origin YOUR_REPO_URL
```

## Future Commands

After the initial setup, use these commands to push future changes:

```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push
```

## Quick Reference

```bash
git status              # Check what files have changed
git add .               # Stage all changes
git add filename.md     # Stage specific file
git commit -m "message" # Commit changes
git push                # Push to GitHub
git pull                # Pull latest from GitHub
```

