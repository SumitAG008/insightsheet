---
title: Sign-in and security
summary: How sign-in works with an emailed login code, the two-device limit, how to reset your password and where to keep a meldra API key.
category: Account and billing
order: 4
updated: 2026-10-06
---

meldra protects every sign-in with a one-time code sent to your email. This article explains how signing in works, what to do if you reach the device limit or forget your password, and what the **Security** page offers.

## Sign in

1. Go to the sign-in page and enter your **Email** and **Password**.
2. Select **Sign In**.
3. meldra emails you a six-digit login code. Enter it in **Verification code**.
4. Select **Verify Code**.

A login code is needed every time you sign in. It works once and only for a short time. If it has expired, select **Back** and sign in again to get a new code.

> **Note:** You must verify your email address before you can sign in. If you see "Please verify your email address before logging in", open the verification email we sent when you created your account.

### Too many attempts

- After several wrong codes, you see "Too many attempts". Select **Back** and sign in again to get a new code.
- After repeated wrong passwords, sign-in is paused and you see "Too many failed sign-in attempts. Please wait … minutes or reset your password."

## The two-device limit

Your account can be signed in on two devices at the same time.

If you sign in on a third device, meldra shows "Your account is already signed in on 2 devices. Sign one of them out to continue on this device." Each signed-in device is listed with its approximate location, IP address and when it was last active.

1. Find the device you no longer need.
2. Select **Sign out and continue here**.

That device is signed out and you are signed in on the new one. Your login code stays valid while you choose.

You can also sign devices out at any time from **Settings**, under **Signed-in devices**. See [Account settings](/help/account-settings).

> **Tip:** If you see a device you do not recognise, sign it out and reset your password.

## Reset your password

1. On the sign-in page, select **Forgot password?**.
2. Enter your **Email** and select **Send Reset Link**.
3. Open the email and select the link. The link works for one hour.
4. Enter a **New Password** and **Confirm Password**, then select **Reset Password**.

You can also start from **Settings**, under **Change Password**, with **Send Reset Email**.

For security, meldra shows the same message whether or not an account exists for that email: "If an account with that email exists, a password reset link has been sent to your email."

Your password must be at least 10 characters long and no more than 72 bytes. Some special characters count as more than one byte.

> **Note:** Resetting your password also verifies your email address, because the link proves you can read that inbox.

## The Security page

Open your account menu at the top right and select **Security**.

The **Security Score** card shows whether your email is verified and confirms that an **Email login code (required)** protects every sign-in.

### Keep a meldra API key in this browser

The **meldra API Key (for external API only)** card stores an API key for calling meldra from your own apps or from developer.meldra.ai. Document Converter and FileName Cleaner inside meldra do not use or need this key.

1. Paste your key into the **meldra API key** field.
2. Select **Save**. The card shows **Key is set**.
3. To delete the key from this browser, select **Remove**.

> **Important:** The key is saved in this browser's storage, not in your meldra account. Select **Remove** before you leave a shared computer.

To get a key, see [Use the meldra API](/help/use-the-meldra-api).

## Next steps

- [Account settings](/help/account-settings)
- [Use the meldra API](/help/use-the-meldra-api)
