import express, { Request, Response } from 'express';
import { s3 } from '../lib/s3Client';
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = express.Router();

//@ts-ignore
router.get('/', async (req: Request, res: Response) => {
    const fileName = req.query.fileName as string;
    const contentType = req.query.contentType as string;

    if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType are required' });
    }


    const command = new PutObjectCommand({
        Bucket: 'meetup.wt',
        Key: `${fileName}`,
        ContentType: contentType as string
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 600 });
    res.json({ url });
});

//@ts-ignore
router.get('/videos', async (req: Request, res: Response) => {
    const email = req.query.email as string;

    if (!email) {
        return res.status(400).json({ error: 'email is required' });
    }

    try {
        const command = new ListObjectsV2Command({
            Bucket: "meetup.wt",
            Prefix: `recordings/${email}/`,
        });

        const response = await s3.send(command);

        const files = response.Contents?.filter(item => item.Key && !item.Key.endsWith('/')) || [];

        if (files.length === 0) {
            return res.status(404).json({ message: 'No videos found for this user.' });
        }

        const videoUrls = await Promise.all(
            files.map(async (item) => {
                const getCommand = new GetObjectCommand({
                    Bucket: "meetup.wt",
                    Key: item.Key,
                    ResponseContentDisposition: 'attachment; filename="video.mp4"',
                });
                const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 604800 });
                return signedUrl;
            })
        );

        return res.json({ videos: videoUrls });
    } catch (err) {
        console.error("Error listing videos:", err);
        res.status(500).json({ error: 'Failed to get videos.' });
    }
});


export default router;
