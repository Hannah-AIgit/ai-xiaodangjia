const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../AI-Home-Kitchen-Assistant/pantry-photos.js'), 'utf8');

function setup({mobile = false, access = true, getMedia} = {}) {
  const ids = ['photoUpload', 'photoCapture', 'photoCameraDialog', 'photoCameraVideo',
    'photoCameraShutter', 'photoCameraStatus', 'photoCaptureOpen', 'photoUploadOpen', 'photoCameraCancel'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    value: '', files: [], disabled: true, open: false, clicks: 0, listeners: {},
    click() { this.clicks++; return this.onclick?.(); },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    showModal() { this.open = true; },
    close() { this.open = false; this.listeners.close?.(); },
    pause() {},
    async play() { this.videoWidth = 640; this.videoHeight = 480; }
  }]));
  let stopped = 0, mediaCalls = 0;
  const stream = {getTracks: () => [{stop: () => stopped++}]};
  const photos = [], messages = [], revoked = [], constraints = [];
  const window = {addEventListener() {}};
  const navigator = {userAgent: mobile ? 'iPhone' : 'Desktop', maxTouchPoints: mobile ? 1 : 0,
    mediaDevices: {getUserMedia(c) { mediaCalls++; constraints.push(c); return getMedia ? getMedia(stream) : Promise.resolve(stream); }}};
  const document = {getElementById: id => elements[id], createElement: () => ({
    getContext: () => ({drawImage() {}}), toDataURL: () => 'data:image/jpeg;base64,test'
  })};
  class Image { constructor() { this.naturalWidth = 2000; this.naturalHeight = 1000; } set src(_) { this.onload(); } }
  runInNewContext(source, {window, document, navigator, Image,
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL: url => revoked.push(url)}});
  window.KitchenPhotoPicker.init({requireAccess: () => access, onPhoto: p => photos.push(p), showMessage: m => messages.push(m)});
  return {elements, photos, messages, revoked, constraints, stream, navigator,
    get stopped() { return stopped; }, get mediaCalls() { return mediaCalls; }};
}

test('phone capture and upload use different pickers, then the same photo pipeline', async () => {
  const s = setup({mobile: true}), e = s.elements;
  await e.photoCaptureOpen.click();
  assert.equal(e.photoCapture.clicks, 1); assert.equal(e.photoUpload.clicks, 0); assert.equal(s.mediaCalls, 0);
  const file = {type: 'image/jpeg', size: 100};
  e.photoCapture.files = [file]; e.photoCapture.value = 'camera.jpg'; e.photoCapture.onchange({target: e.photoCapture});
  e.photoUploadOpen.click();
  assert.equal(e.photoUpload.clicks, 1);
  e.photoUpload.files = [file]; e.photoUpload.value = 'album.jpg'; e.photoUpload.onchange({target: e.photoUpload});
  assert.equal(s.photos.length, 2); assert.equal(s.revoked.length, 2);
  assert.equal(e.photoCapture.value, ''); assert.equal(e.photoUpload.value, '');
  e.photoUpload.files = []; e.photoUpload.onchange({target: e.photoUpload});
  assert.equal(s.photos.length, 2); // Cancelling preserves the existing photo.
});

test('desktop capture takes a frame and releases every camera track', async () => {
  const s = setup(), e = s.elements;
  await e.photoCaptureOpen.click();
  assert.equal(e.photoCameraDialog.open, true); assert.equal(e.photoCameraShutter.disabled, false);
  assert.equal(s.constraints[0].audio, false); assert.equal(s.constraints[0].video.facingMode.ideal, 'environment');
  e.photoCameraShutter.click();
  assert.equal(s.photos.length, 1); assert.equal(e.photoCameraDialog.open, false);
  assert.equal(s.stopped, 1); assert.equal(e.photoCameraVideo.srcObject, null);
  assert.equal(e.photoUpload.clicks, 0);
});

test('cancelling before camera permission resolves cannot leak a camera stream', async () => {
  let resolve;
  const s = setup({getMedia: () => new Promise(r => { resolve = r; })}), e = s.elements;
  const pending = e.photoCaptureOpen.click();
  e.photoCameraCancel.click(); resolve(s.stream); await pending;
  assert.equal(s.stopped, 1); assert.equal(e.photoCameraDialog.open, false);
  assert.equal(e.photoCameraVideo.srcObject, null); assert.equal(e.photoCameraShutter.disabled, true);
});

test('permission denial explains how to continue and leaves capture disabled', async () => {
  const error = Object.assign(new Error('denied'), {name: 'NotAllowedError'});
  const s = setup({getMedia: () => Promise.reject(error)}), e = s.elements;
  await e.photoCaptureOpen.click();
  assert.match(e.photoCameraStatus.textContent, /相机权限/);
  assert.equal(e.photoCameraShutter.disabled, true); assert.equal(e.photoCameraVideo.srcObject, null);
});

test('unavailable cameras and blocked membership never silently open the upload picker', async () => {
  const s = setup(); s.navigator.mediaDevices = undefined;
  await s.elements.photoCaptureOpen.click();
  assert.match(s.messages[0], /无法拍摄/); assert.equal(s.elements.photoUpload.clicks, 0);
  const locked = setup({access: false});
  await locked.elements.photoCaptureOpen.click(); locked.elements.photoUploadOpen.click();
  assert.equal(locked.mediaCalls, 0); assert.equal(locked.elements.photoUpload.clicks, 0);
});

test('oversized and non-image files are rejected without replacing the preview', () => {
  const s = setup(), input = s.elements.photoUpload;
  input.files = [{type: 'image/png', size: 16e6}]; input.onchange({target: input});
  input.files = [{type: 'text/plain', size: 100}]; input.onchange({target: input});
  assert.equal(s.photos.length, 0); assert.equal(s.messages.length, 2);
});
