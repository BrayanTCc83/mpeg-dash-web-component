import VideoDashConfiguration from "./VideoDashConfiguration.js";
import WebmHeader from "./WebMHeader.js";
import VideoDash from "./VideoDash.js";
import WebMController from "./WebMController.js";
import DashController from "./DashController.js";

class VideoDashController {
    config;
    _videoDashId;
    /**
     * @type {VideoDash}
     */
    _videoDashSource;
    /**
     * @type {CanvasRenderingContext2D}
     */
    _context;
    /**
     * @type {boolean}
     */
    _isInFastMode = false;
    /**
     * @type {HTMLVideoElement}
     */
    _source;
    _volume = 1;
    _currentRequest = {};
    /**
     * @type {number}
     */
    _isPictureInPicture = false;
    /**
     * 
     * @param {string} videoDashId 
     * @param {VideoDashConfiguration} configuration 
     */
    constructor(videoDashId, configuration) {
        this._videoDashId = videoDashId;
        this._videoDashSource = document.getElementById(videoDashId);
        this.config = configuration;
        this._canvas = this._videoDashSource.getCanvas();
        this._context = this._canvas.getContext("2d");
        
        this.config.setController(this);
        this._videoDashSource.setController(this);
    }

    initController() {
        this._initDashPlayer();
        this._initCanvas();
    }

    _initDashPlayer = async _ => {
        await this._controller._loadManifest();
        await this._controller._initPlayer();
        this._controller.start();
    }

    _setManifest = async _ => {
        await this._controller._loadManifest();
    }

    _pictureOnPictureMessage = _ => {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._context.font = "48px sans";
        this._context.fillStyle = 'white';
        this._context.fillText('El vídeo está en modo picture in picture.', this._canvas.width/3 - 50, this._canvas.height/2);
    }

    _paintOnCanvas = _ => {
        if(this._isPictureInPicture)
            return this._pictureOnPictureMessage();
        
        this._context.drawImage(this._source, 0, 0, this._canvas.width, this._canvas.height);
    }

    _initCanvas = _ => {
        this._context.imageSmoothingQuality = "high"
        this._context.imageSmoothingEnabled = false;
        this._source.addEventListener("loadedmetadata", _ => {
            this._canvas.height = window.screen.availHeight;
            this._canvas.width = window.screen.availWidth;
            this._source.addEventListener('play', _ => {
                const loop = (_) =>  {
                    if (!this._source.paused && !this._source.ended) {
                        this._paintOnCanvas(); 
                        setTimeout(loop, 1000 / this.config._frameRate);
                    }
                }
                loop();
            }, 0);
        });
    }

    setPlayPause(isPaused) {
        this._isPaused = isPaused;
        try {
            if(isPaused) {
                this._source.pause();
                this._videoDashSource._audio.pause();
            } else {
                this._source.play();
                this._videoDashSource._audio.play();
            }
        } catch(e){}
    }

    startFastForward = _ => {
        this._isInFastMode = true;
        this._source.pause();
        this._interval = setInterval(_ => {
            if(!this._isInFastMode)
                return;

            this._source.currentTime += 0.2;
            this._paintOnCanvas();
        }, 1);
    }

    stopFastForward = _ => {
        this._isInFastMode = false;
        clearInterval(this._interval);
        this._source.play();
    }

    startFastRewind = _ => {
        this._isInFastMode = true;
        this._source.pause();
        this._interval = setInterval(_ => {
            if(!this._isInFastMode)
                return; 

            if(this._source.currentTime >= 0.1)
                this._source.currentTime -= 0.1;
            else
                this._source.currentTime = 0;
            this._paintOnCanvas();
        }, 1);
    }

    stopFastRewind = _ => {
        this._isInFastMode = false;
        clearInterval(this._interval);
        this._source.play();
    }

    seekForward = _ => {
        this._source.currentTime += 10;
        this._paintOnCanvas();
    }

    seekBackward = _ => {
        this._source.currentTime -= 10;
        this._paintOnCanvas();
    }

    updateVolume = (volume) => {
        if(this._isMuted)
            return;
        this._volume = Number(volume)/100
        this._source.volume = this._volume;
    }

    setMuteUnmute = (isMuted) => {
        this._isMuted = isMuted;
        if(this._isMuted)
            this._source.volume = 0;
        else
            this._source.volume = this._volume;
    }

    setReproductionSpeed = (speed) => {
        this._source.playbackRate = speed;
    }

    setReproductionAutoQuality = _ => {
        this._controller.setFixedResolution(-1);
    }

    setReproductionQuality = (quality) => {
        this._controller.setFixedResolution(quality);
    }

    seekToPosition = position => {
        this._source.currentTime = position * this._source.duration;
        this._controller.seek();
    }

    getPosition = _ => {
        return this._source.currentTime/this._source.duration;
    }

    changeRenderMode = (isPictureInPicture) => {
        this._isPictureInPicture = isPictureInPicture;
        this.setPlayPause(this._isPaused);
    }

    start = _ => {
        this._source = this._videoDashSource.createSource();
        this._controller = new DashController(this.config, this);
        this.initController();
    }
}

export default VideoDashController;