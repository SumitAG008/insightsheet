"""
Email Service for sending password reset and notification emails
"""
import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    """
    Send password reset email to user
    
    Args:
        email: User's email address
        reset_link: Password reset link with token
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get email configuration from environment variables
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        
        # If SMTP credentials not configured, log and return False
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Email not sent. Reset link: " + reset_link)
            return False
        
        # SECURITY: Ensure reset_link uses HTTPS
        if not reset_link.startswith("https://"):
            logger.warning(f"Reset link is not HTTPS: {reset_link}")
            reset_link = reset_link.replace("http://", "https://")
        
        # Create email message with proper headers for anti-phishing
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reset Your Password - Meldra"
        message["From"] = f"Meldra <{smtp_from_email}>"
        message["To"] = email
        message["Reply-To"] = "noreply@meldra.ai"
        message["List-Unsubscribe"] = "<https://insight.meldra.ai/unsubscribe>"
        # Add security headers
        message["X-Mailer"] = "Meldra Email Service"
        message["X-Entity-Ref-ID"] = "meldra-password-reset"
        
        # Email body (HTML) - Professional and anti-phishing compliant
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ padding: 30px; }}
                .button {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }}
                .button:hover {{ opacity: 0.9; }}
                .security-notice {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .security-notice strong {{ color: #856404; }}
                .link-box {{ background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; margin: 20px 0; word-break: break-all; font-size: 12px; color: #667eea; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #dee2e6; }}
                .footer a {{ color: #667eea; text-decoration: none; }}
                .company-info {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 11px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your <strong>Meldra</strong> account (<strong>insight.meldra.ai</strong>).</p>
                    
                    <div class="security-notice">
                        <strong>🔒 Security Notice:</strong> This email is from Meldra. Always verify the sender is <strong>@meldra.ai</strong> and links go to <strong>https://insight.meldra.ai</strong>. Never share your password reset link with anyone.
                    </div>
                    
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button" style="color: white;">Reset Password</a>
                    </p>
                    
                    <p>Or copy and paste this secure link into your browser:</p>
                    <div class="link-box">
                        {reset_link}
                    </div>
                    
                    <p><strong>⏰ This link will expire in 1 hour for your security.</strong></p>
                    
                    <p><strong>If you didn't request this:</strong> Please ignore this email. Your password will remain unchanged. If you're concerned about your account security, contact us at <a href="mailto:security@meldra.ai">security@meldra.ai</a>.</p>
                    
                    <p>Best regards,<br><strong>The Meldra Team</strong></p>
                </div>
                <div class="footer">
                    <p><strong>Meldra</strong> - Privacy-First Data Analysis Platform</p>
                    <p>
                        <a href="https://insight.meldra.ai">Visit our website</a> | 
                        <a href="https://insight.meldra.ai/privacy">Privacy Policy</a> | 
                        <a href="mailto:support@meldra.ai">Support</a>
                    </p>
                    <div class="company-info">
                        <p>This is an automated email from Meldra. Please do not reply to this email.</p>
                        <p>Meldra | insight.meldra.ai | © 2026 Meldra. All rights reserved.</p>
                        <p>This email was sent to {email} because a password reset was requested for your account.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version (for email clients that don't support HTML)
        text_body = f"""
        Password Reset Request - Meldra
        
        Hello,
        
        We received a request to reset your password for your Meldra account (insight.meldra.ai).
        
        SECURITY NOTICE: This email is from Meldra. Always verify the sender is @meldra.ai and links go to https://insight.meldra.ai. Never share your password reset link with anyone.
        
        Click this secure link to reset your password:
        {reset_link}
        
        This link will expire in 1 hour for your security.
        
        If you didn't request this: Please ignore this email. Your password will remain unchanged. If you're concerned about your account security, contact us at security@meldra.ai.
        
        Best regards,
        The Meldra Team
        
        ---
        Meldra - Privacy-First Data Analysis Platform
        Website: https://insight.meldra.ai
        Privacy Policy: https://insight.meldra.ai/privacy
        Support: support@meldra.ai
        
        This is an automated email from Meldra. Please do not reply to this email.
        This email was sent to {email} because a password reset was requested for your account.
        © 2026 Meldra. All rights reserved.
        """
        
        # Attach both versions
        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))
        
        # Send email using aiosmtplib
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            use_tls=True,
        )
        
        logger.info(f"Password reset email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {str(e)}")
        return False


async def send_verification_email(email: str, full_name: str, verification_link: str) -> bool:
    """
    Send email verification email to new user
    
    Args:
        email: User's email address
        full_name: User's full name
        verification_link: Email verification link with token
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        # SECURITY: Use HTTPS production URL by default, not localhost
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Verification email not sent. Verification link: " + verification_link)
            return False
        
        # SECURITY: Ensure verification_link uses HTTPS
        if not verification_link.startswith("https://"):
            logger.warning(f"Verification link is not HTTPS: {verification_link}")
            verification_link = verification_link.replace("http://", "https://")
        
        message = MIMEMultipart("alternative")
        message["Subject"] = "Verify Your Email - Meldra"
        message["From"] = f"Meldra <{smtp_from_email}>"
        message["To"] = email
        message["Reply-To"] = "noreply@meldra.ai"
        message["List-Unsubscribe"] = "<https://insight.meldra.ai/unsubscribe>"
        message["X-Mailer"] = "Meldra Email Service"
        message["X-Entity-Ref-ID"] = "meldra-email-verification"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ padding: 30px; }}
                .button {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }}
                .button:hover {{ opacity: 0.9; }}
                .security-notice {{ background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .security-notice strong {{ color: #0c5460; }}
                .link-box {{ background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; margin: 20px 0; word-break: break-all; font-size: 12px; color: #667eea; }}
                .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #dee2e6; }}
                .footer a {{ color: #667eea; text-decoration: none; }}
                .company-info {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 11px; color: #999; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Verify Your Email Address</h1>
                </div>
                <div class="content">
                    <p>Hello {full_name or 'there'},</p>
                    <p>Thank you for registering with <strong>Meldra</strong>! To complete your registration and activate your account, please verify your email address.</p>
                    
                    <div class="security-notice">
                        <strong>🔒 Security Notice:</strong> This email is from Meldra. Always verify the sender is <strong>@meldra.ai</strong> and links go to <strong>https://insight.meldra.ai</strong>.
                    </div>
                    
                    <p>Click the button below to verify your email:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button" style="color: white;">Verify Email Address</a>
                    </div>
                    
                    <p>Or copy and paste this secure link into your browser:</p>
                    <div class="link-box">
                        {verification_link}
                    </div>
                    
                    <p><strong>⏰ This verification link will expire in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account with Meldra, please ignore this email. No account will be created.</p>
                    
                    <p>Best regards,<br><strong>The Meldra Team</strong></p>
                </div>
                <div class="footer">
                    <p><strong>Meldra</strong> - Privacy-First Data Analysis Platform</p>
                    <p>
                        <a href="https://insight.meldra.ai">Visit our website</a> | 
                        <a href="https://insight.meldra.ai/privacy">Privacy Policy</a> | 
                        <a href="mailto:support@meldra.ai">Support</a>
                    </p>
                    <div class="company-info">
                        <p>This is an automated email from Meldra. Please do not reply to this email.</p>
                        <p>Meldra | insight.meldra.ai | © 2026 Meldra. All rights reserved.</p>
                        <p>This email was sent to {email} because you registered for a Meldra account.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Verify Your Email Address - Meldra
        
        Hello {full_name or 'there'},
        
        Thank you for registering with Meldra! To complete your registration and activate your account, please verify your email address.
        
        SECURITY NOTICE: This email is from Meldra. Always verify the sender is @meldra.ai and links go to https://insight.meldra.ai.
        
        Click this secure link to verify your email:
        {verification_link}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with Meldra, please ignore this email. No account will be created.
        
        Best regards,
        The Meldra Team
        
        ---
        Meldra - Privacy-First Data Analysis Platform
        Website: https://insight.meldra.ai
        Privacy Policy: https://insight.meldra.ai/privacy
        Support: support@meldra.ai
        
        This is an automated email from Meldra. Please do not reply to this email.
        This email was sent to {email} because you registered for a Meldra account.
        © 2026 Meldra. All rights reserved.
        """
        
        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            use_tls=True,
        )
        
        logger.info(f"Verification email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {str(e)}")
        return False


async def send_welcome_email(email: str, full_name: str) -> bool:
    """
    Send welcome email to new user
    
    Args:
        email: User's email address
        full_name: User's full name
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Welcome email not sent.")
            return False
        
        message = MIMEMultipart("alternative")
        message["Subject"] = "Welcome to Meldra! 🎉"
        message["From"] = smtp_from_email
        message["To"] = email
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Meldra! 🎉</h1>
                </div>
                <div class="content">
                    <p>Hello {full_name or 'there'},</p>
                    <p>Thank you for joining Meldra - your privacy-first data analysis platform!</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Upload and analyze your data</li>
                        <li>Create database schemas</li>
                        <li>Generate AI-powered insights</li>
                        <li>Build P&L statements</li>
                    </ul>
                    <p>Get started by visiting: <a href="https://insight.meldra.ai">insight.meldra.ai</a></p>
                    <p>Best regards,<br>The Meldra Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to Meldra!
        
        Hello {full_name or 'there'},
        
        Thank you for joining Meldra - your privacy-first data analysis platform!
        
        Get started by visiting: https://insight.meldra.ai
        
        Best regards,
        The Meldra Team
        """
        
        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            use_tls=True,
        )
        
        logger.info(f"Welcome email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {email}: {str(e)}")
        return False
