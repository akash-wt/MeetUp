import express, { Request, Response } from 'express';
import { s3 } from '../lib/s3Client';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = express.Router();

//@ts-ignore
router.get('/', async (req: Request, res: Response) => {
    const fileName = req.query.fileName as string;
    const contentType = req.query.contentType as string;

    if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const date = new Date();
    const easyDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;


    const command = new PutObjectCommand({
        Bucket: 'meetup.wt',
        Key: `recordings/${easyDate}-${fileName}`,
        ContentType: contentType as string
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });
    res.json({ url });
});

//@ts-ignore
router.get('/access', async (req: Request, res: Response) => {
    const fileName = req.query.fileName as string;

    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }

    const command = new GetObjectCommand({
        Bucket: 'meetup.wt',
        Key: `recordings/${fileName}`
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });

    res.json({ url });
});




export default router;
