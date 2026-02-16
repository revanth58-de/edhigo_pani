# Quick Fix Guide: Running App on iPhone

## Current Status
- ✅ Backend server running (port 5000)
- ✅ Expo running with tunnel mode
- ⚠️ Windows Firewall blocking direct connections

## Option 1: Simple Fix - Temporarily Disable Firewall (RECOMMENDED)

This is the fastest way to get it working:

1. **Press Windows key**, type "firewall"
2. Click "**Windows Defender Firewall**"  
3. Click "**Turn Windows Defender Firewall on or off**" (left side)
4. Select "**Turn off Windows Defender Firewall**" for **Private networks** only
5. Click OK

> [!CAUTION]
> Remember to turn firewall back on after development!

Then **scan the QR code** showing in your Expo terminal - it should work now.

---

## Option 2: Add Firewall Rules (Requires Admin)

If you have admin access, run PowerShell as Administrator:

```powershell
netsh advfirewall firewall add rule name="Expo Dev Server" dir=in action=allow protocol=TCP localport=8081

netsh advfirewall firewall add rule name="Backend API Server" dir=in action=allow protocol=TCP localport=5000
```

Then restart Expo in regular mode (not tunnel).

---

## Option 3: Use Tunnels for Everything (Slower)

Keep Expo in tunnel mode (already done ✓), but you'll need to:

1. Start a tunnel for backend:
   ```powershell
   lt --port 5000
   ```

2. Update API config in `mobile/src/config/api.config.js`:
   - Change `DEV_MODE = 'TUNNEL'`
   - Update `TUNNEL:` URL with the one from localtunnel

This is slower and less reliable.

---

## Recommended: Option 1

**Just temporarily disable Windows Firewall for Private networks**, scan the QR code, and the app should load perfectly!
