import boto3
import os
import io
import uuid
import logging

logger = logging.getLogger(__name__)

class AWSS3Service:
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        # boto3 automatically picks up AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from env
        if self.bucket_name:
            self.s3_client = boto3.client("s3", region_name=self.region)
        else:
            self.s3_client = None
            logger.warning("AWS_S3_BUCKET is not set. S3 exports will fail.")

    def upload_export(self, file_content: bytes, filename: str, content_type: str = "application/json") -> str:
        """
        Uploads a generated report to S3 and returns a pre-signed URL valid for 1 hour.
        """
        if not self.s3_client or not self.bucket_name:
            raise Exception("AWS S3 is not completely configured. Set AWS_S3_BUCKET.")

        object_key = f"esg_exports/{uuid.uuid4()}_{filename}"
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_content,
                ContentType=content_type
            )
            
            # Generate pre-signed url
            presigned_url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=3600
            )
            return presigned_url
        except Exception as e:
            logger.error(f"Failed to upload {filename} to S3: {e}")
            raise Exception("Failed to upload to S3. Check server logs.")
