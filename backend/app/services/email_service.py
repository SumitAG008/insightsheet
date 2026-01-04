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
        frontend_url = os.getenv("FRONTEND_URL", "https://insight.meldra.ai")
        
        # If SMTP credentials not configured, log and return False
        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Email not sent. Reset link: " + reset_link)
            return False
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reset Your Password - Meldra"
        message["From"] = smtp_from_email
        message["To"] = email
        
        # Email body (HTML)
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your Meldra account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">{reset_link}</p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    <p>Best regards,<br>The Meldra Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply.</p>
                    <p>&copy; 2026 Meldra. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
        Password Reset Request
        
        Hello,
        
        We received a request to reset your password for your Meldra account.
        
        Click this link to reset your password:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        Best regards,
        The Meldra Team
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
