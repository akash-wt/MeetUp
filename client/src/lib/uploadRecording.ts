import axios from 'axios'
import { BACKEND_URL } from '../config'

const uploadRecording = async (
    recordedBlob: Blob,
    roomId: string,
    chunkIndex: number,
    onProgress: (progress: number) => void
) => {
    const user = localStorage.getItem("user")
    const userData = user ? JSON.parse(user) : null

    if (!userData?.email) {
        console.error("User email not found")
        return
    }

    const fileName = `recordings/${userData.email}/${roomId}/chunk-${chunkIndex}.mp4`
    const contentType = 'video/mp4'

    try {
        const presignRes = await axios.get(`${BACKEND_URL}/api/presign`, {
            params: { fileName, contentType }
        })

        const url = presignRes.data.url

        const uploadRes = await axios.put(url, recordedBlob, {
            headers: { 'Content-Type': contentType },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(percentCompleted)
                }
            }
        })

        if (uploadRes.status >= 200 && uploadRes.status < 300) {
            console.log("Recording uploaded successfully!")
        } else {
            console.error("Upload failed")
        }

    } catch (error) {
        console.error("Upload error:", error)
    }
}

export { uploadRecording }
