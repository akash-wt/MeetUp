const uploadRecording = async (recordedBlob: Blob, roomId: string) => {
    console.log(roomId);
    

    const fileName = `${roomId}_user.mp4`;
    const contentType = 'video/mp4';


    const res = await fetch(`http://localhost:5080/api/presign?fileName=${fileName}&contentType=${contentType}`);
    const { url } = await res.json();

    const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType
        },
        body: recordedBlob
    });

    if (uploadRes.ok) {
        console.log('Recording uploaded successfully!');
    } else {
        console.error('Upload failed');
    }
};


export { uploadRecording };