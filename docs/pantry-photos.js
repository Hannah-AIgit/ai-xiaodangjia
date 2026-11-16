// Two independent entry points share the existing photo preview and recognition flow.
(function () {
  function init({requireAccess, onPhoto, showMessage}) {
    const byId = id => document.getElementById(id);
    const upload = byId('photoUpload'), nativeCapture = byId('photoCapture');
    const dialog = byId('photoCameraDialog'), video = byId('photoCameraVideo');
    const shutter = byId('photoCameraShutter'), status = byId('photoCameraStatus');
    let stream = null, requestId = 0;
    const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

    function jpeg(source, width, height) {
      if (!width || !height) throw new Error('No image frame');
      const scale = Math.min(1, 1100 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', .78);
    }

    function stopCamera() {
      requestId++;
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.pause();
      video.srcObject = null;
      shutter.disabled = true;
    }

    function receiveFile(event) {
      const input = event.target, file = input.files?.[0];
      input.value = ''; // Allow selecting the same photo again after cancel/retry.
      if (!file || !requireAccess()) return;
      if (file.size > 15e6) return showMessage('图片请小于15 MB');
      if (file.type && !file.type.startsWith('image/')) return showMessage('请选择图片文件');
      const url = URL.createObjectURL(file), image = new Image();
      image.onload = () => {
        try { onPhoto(jpeg(image, image.naturalWidth, image.naturalHeight)); }
        catch (_) { showMessage('这张图片暂时无法读取，请换一张 JPG 或 PNG 照片'); }
        finally { URL.revokeObjectURL(url); }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        showMessage('这张图片暂时无法读取，请换一张 JPG 或 PNG 照片');
      };
      image.src = url;
    }

    byId('photoUploadOpen').onclick = () => {
      if (requireAccess()) upload.click();
    };
    upload.onchange = receiveFile;
    nativeCapture.onchange = receiveFile;

    byId('photoCaptureOpen').onclick = async () => {
      if (!requireAccess()) return;
      // On phones/tablets, request the device camera directly instead of the photo library.
      if (isMobile()) return nativeCapture.click();
      if (!navigator.mediaDevices?.getUserMedia || !dialog.showModal) {
        return showMessage('当前浏览器无法拍摄，请使用支持相机的 HTTPS 浏览器，或选择「上传现有照片」');
      }
      stopCamera();
      const currentRequest = requestId;
      status.textContent = '正在连接相机…';
      dialog.showModal();
      try {
        const capturedStream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: {ideal: 'environment'}}, audio: false
        });
        // A late permission response must not keep the camera running after cancel.
        if (currentRequest !== requestId || !dialog.open) {
          capturedStream.getTracks().forEach(track => track.stop());
          return;
        }
        stream = capturedStream;
        video.srcObject = stream;
        await video.play();
        if (currentRequest !== requestId || !dialog.open) return;
        shutter.disabled = !(video.videoWidth && video.videoHeight);
        status.textContent = '对准食材，点击「拍摄」即可。';
      } catch (error) {
        if (currentRequest !== requestId || !dialog.open) return;
        stopCamera();
        status.textContent = error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? '未获得相机权限。请允许浏览器使用相机，或选择「上传现有照片」。'
          : error.name === 'NotFoundError'
            ? '这台设备没有可用相机，请选择「上传现有照片」。'
            : '暂时无法使用相机，请关闭其他占用相机的应用，或选择「上传现有照片」。';
      }
    };

    video.onloadeddata = () => {
      shutter.disabled = !(dialog.open && stream && video.videoWidth && video.videoHeight);
    };
    shutter.onclick = () => {
      if (!requireAccess()) { dialog.close(); return; }
      try { onPhoto(jpeg(video, video.videoWidth, video.videoHeight)); dialog.close(); }
      catch (_) { status.textContent = '画面还没准备好，请稍等一下再拍摄。'; }
    };
    byId('photoCameraCancel').onclick = () => dialog.close();
    dialog.addEventListener('close', stopCamera);
    dialog.addEventListener('cancel', stopCamera);
    window.addEventListener('pagehide', stopCamera);
  }
  window.KitchenPhotoPicker = {init};
})();
