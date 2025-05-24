import { S3Client } from '@aws-sdk/client-s3';
import { log } from 'console';
import dotenv from "dotenv";
dotenv.config();


export const s3 = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
    }
});
