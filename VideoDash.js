import VideoDashConfiguration from "./VideoDashConfiguration.js";
import VideoDashControls from "./VideoDashControls.js";

class VideoDash extends HTMLElement {
    static _volumeIcons = {
        '0,33': 'volume_mute',
        '34,66': 'volume_down',
        '67,100': 'volume_up'
    };
    static _mutedIcon = 'volume_off';
    static _playPauseIcons = {
        'true': 'play_arrow',
        'false': 'pause'
    };

    static _videoDastBase = (function() {
        let base = document.createElement('template');
        base.innerHTML = `
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            <style>
                * {
                    box-sizing: border-box;
                }
                #videoContenedor {
                    position: relative;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: white;
                    flex-direction: column;
                }

                #videoContenedor > div.source {
                    width: 100%;
                    background-color: black;
                    position: relative;
                }

                #volumeControlsContainer {
                    z-index: 2;
                }

                canvas {
                    width: 100%;
                    aspect-ratio: 16/9;
                    cursor: pointer;
                    background-color: var(--no-video-color, #000);
                }

                .controls {
                    padding: 0 15px;
                    background-color: var(--controls-color, #3f3f3f);
                    display: flex;
                    justify-content: space-between;
                    > .centralcontrols {
                        display: flex;
                        justify-content: center;
                        gap: 3%;
                    }
                    > .volumeControls {
                        position: relative;
                        > .volumecontrolcontainer {
                            height: 100%;
                            position: absolute;
                            top: -225%;
                            left: -124%;
                            display: flex;
                            justify-content: center;
                            transform: rotate(-90deg);
                        }
                    }
                }

                input[type=range] {
                    accent-color: var(--controls-color, #3f3f3f);
                    cursor: pointer;
                    z-index: 3;
                }

                .extracontrols {
                    position: absolute;
                    padding: 5px 15px;
                    display: flex;
                    width: 100%;
                    justify-content: space-between;
                    > button {
                        background-color: rgba(0,0,0,0.4);
                    }
                    > .settings {
                        position: relative;
                        > button {
                            background-color: rgba(0,0,0,0.4);
                        }
                    }
                }

                button {
                    padding: 7px;
                    background-color: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    border-radius: 100%;
                }

                #control_volume {
                    display: none;
                }

                #settingsContainer {
                    position: absolute;
                    right: 0;
                    flex-direction: column;
                    background-color: rgba(0,0,0,0.4);
                    border-radius: 5px;
                    display: none;
                }

                #settingsContainer > div {
                    padding-right: 10px;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                #control_volume.show_controller {
                    display: block;
                }

                #settingsContainer.show_controller {
                    display: flex;
                }

                .fix_control_detail {
                    text-align: center;
                    width: 100px;
                    margin: 0;
                    padding: 0;
                }

                #control_fix_resolution, #control_fix_reproduction_speed {
                    #control_fix_resolution_select, #control_fix_speed_select {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        width: 100px;
                        display: flex;
                        height: 0px;
                        overflow: hidden;
                        flex-direction: column;
                        transition: height 0.3s ease;
                        > ul {
                            display: block;
                            margin: 0;
                            padding: 6px;
                            background-color: var(--controls-hover-color, #5e5e5e);
                        }
                        > ul:hover {
                            background-color: var(--controls-color, #3f3f3f);
                        }
                    }
                }

                #control_fix_resolution.show_controller, #control_fix_reproduction_speed.show_controller {
                    position: relative;
                    > span {
                        display: none;
                    }
                    #control_fix_resolution_select, #control_fix_speed_select {
                        height: auto;
                    }
                }

                #timeline_controller {
                    z-index: 1;
                    position: absolute;
                    bottom: 38px;
                    left: 0;
                    width: 100%;
                    height: 6px;
                    background-color: var(--controls-timeline-color, #99999985);
                    cursor: pointer;
                    > #timeline_thumb {
                        height: 100%;
                        background-color: var(--controls-timeline-thumb-color, #000000);
                    }
                }

                :not(:root):fullscreen {
                    .controls {
                        width: 100vw;
                        position: absolute;
                        bottom: 0;
                    }
                }
            </style>
            <div id="videoContenedor">
                <div id="videoComponent" class="source">
                    <div class="extracontrols" id="extracontrolsContainer">
                        <button id="control_picture_in_picture" class="waves-effect waves-light material-icons">picture_in_picture_alt</button>
                        <div id="extracontrols" class="settings">
                            <button id="control_settings" class="waves-effect waves-light material-icons">settings</button>
                            <div class="fixsettings" id="settingsContainer">
                                <div id="control_fix_resolution">
                                    <button class="waves-effect waves-light material-icons">hd</button>
                                    <span id="label_fix_control_resolution" class="fix_control_detail">Auto</span>
                                    <div id="control_fix_resolution_select"></div>
                                </div>
                                <div id="control_fix_reproduction_speed">
                                    <button class="waves-effect waves-light material-icons">speed</button>
                                    <span id="label_fix_control_speed" class="fix_control_detail">1x</span>
                                    <div id="control_fix_speed_select"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <canvas id="canvas"></canvas>
                    <div class="controls">
                        <div id="volumeControlsContainer" class="volumeControls">
                            <button id="control_mute_unmute" class="waves-effect waves-light material-icons">volume_up</button>
                            <div class="volumecontrolcontainer">
                                <input id="control_volume" type="range" name="price" min="0" max="100" step="1" value="60">
                            </div>
                        </div>
                        <div class="centralcontrols">
                            <button id="control_fast_rewind" class="waves-effect waves-light material-icons">fast_rewind</button>
                            <button id="control_backward" class="waves-effect waves-light material-icons">replay_10</button>
                            <button id="control_play_pause" class="waves-effect waves-light material-icons">play_arrow</button>
                            <button id="control_forward" class="waves-effect waves-light material-icons">forward_10</button>
                            <button id="control_fast_forward" class="waves-effect waves-light material-icons">fast_forward</button>
                        </div>
                        <button id="control_fullscreen" class="waves-effect waves-light material-icons">fit_screen</button>
                        <div id="timeline_controller">
                            <div id="timeline_thumb"></div>
                        </div>
                    </div>
                </div>
                <div id="disabled"></div>
            </div>
        `;
        return base;
    })();

    /**
     * @type {HTMLVideoElement}
     */
    _source;
    /**
     * @type {HTMLAudioElement}
     */
    _audio;
    _canvas;
    /**
     * @type {VideoDashController}
     */
    _controller;
    /**
     * It's define all the buttons to control the vídeo.
     * @type {Record<string, HTMLElement>}
     */
    _controls = {};
    _isMuted = false;
    /**
     * @type {string}
     */
    _lastAudioIcon = VideoDash._volumeIcons['67,100'];
    _isPaused = true;
    _volumeControllsContainer;
    _isFixed = false;
    _fixedResolution;
    _reproduction_speed = VideoDashConfiguration.SPEEDS[VideoDashConfiguration.DEFAULT_SPEED];
    /**
     * @type {boolean}
     */
    _isPictureInPicture;
    constructor() {
        super();
    }
  
    connectedCallback() {
        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.appendChild(VideoDash._videoDastBase.content);
        this._canvas = this.shadow.getElementById('canvas');
        this._videoComponent = this.shadow.getElementById('videoComponent');
        this._controls[VideoDashControls.FAST_REWIND]            = this.shadow.getElementById(`control_fast_rewind`);
        this._controls[VideoDashControls.SEEK_BACKWARD]          = this.shadow.getElementById(`control_backward`);
        this._controls[VideoDashControls.PLAY_PAUSE]             = this.shadow.getElementById(`control_play_pause`);
        this._controls[VideoDashControls.SEEK_FORWARD]           = this.shadow.getElementById(`control_forward`);
        this._controls[VideoDashControls.FAST_FORWARD]           = this.shadow.getElementById(`control_fast_forward`);
        this._controls[VideoDashControls.FULLSCREEN]             = this.shadow.getElementById(`control_fullscreen`);
        this._controls[VideoDashControls.MUTE_UNMUTE]            = this.shadow.getElementById(`control_mute_unmute`);
        this._controls[VideoDashControls.VOLUME]                 = this.shadow.getElementById(`control_volume`);
        this._controls[VideoDashControls.PICTURE_IN_PICTURE]     = this.shadow.getElementById(`control_picture_in_picture`);
        this._controls[VideoDashControls.FIX_RESOLUTION]         = this.shadow.getElementById(`control_fix_resolution`);
        this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED] = this.shadow.getElementById(`control_fix_reproduction_speed`);
        this._controls[VideoDashControls.SETTINGS]               = this.shadow.getElementById(`control_settings`);
        this._volumeControllsContainer                           = this.shadow.getElementById('volumeControlsContainer');
        this._extracontrolsContainer                             = this.shadow.getElementById('extracontrols');
        this._settingsContainer                                  = this.shadow.getElementById('settingsContainer');
        this._fixResolutionSelect                                = this.shadow.getElementById('control_fix_resolution_select');
        this._labelFixResolution                                 = this.shadow.getElementById('label_fix_control_resolution');
        this._fixSpeedSelect                                     = this.shadow.getElementById('control_fix_speed_select');
        this._labelFixSpeed                                      = this.shadow.getElementById('label_fix_control_speed');
        this._timelineController                                 = this.shadow.getElementById('timeline_controller');
        this._timelineThumb                                      = this.shadow.getElementById('timeline_thumb');
    }

    _togglePlayPause = event => {
        if(event.target.tag === 'CANVAS' && this._isPictureInPicture)
            return;

        this._isPaused = !this._isPaused;
        this._controls[VideoDashControls.PLAY_PAUSE].innerText = VideoDash._playPauseIcons[this._isPaused];
        this._controller.setPlayPause(this._isPaused);
    }

    _changeVolumeHandler = _ => {
        let volume = this._controls[VideoDashControls.VOLUME].value;
        this._controller?.updateVolume(volume);
        Object.entries(VideoDash._volumeIcons).forEach( ([range, icon]) => {
            const [begin, end] = range.split(',');
            if(Number(begin) <= volume && Number(end) >= volume) {
                this._lastAudioIcon = icon;
                this._controls[VideoDashControls.MUTE_UNMUTE].innerText = icon;
            }
        });
    }

    _showVolumeHandler = _ => {
        if(this._isMuted) {
            this._hideVolumeHanlder();
            return;
        }
        this._controls[VideoDashControls.VOLUME].classList.add('show_controller');
    }
    
    _hideVolumeHanlder = _ => {
        this._controls[VideoDashControls.VOLUME].classList.remove('show_controller');
    }
    
    _muteUnmuteHandler = _ => {
        this._isMuted = !this._isMuted;
        this._controller.setMuteUnmute(this._isMuted);
        if(this._isMuted) {
            this._hideVolumeHanlder();
            this._controls[VideoDashControls.MUTE_UNMUTE].innerText = VideoDash._mutedIcon;
            return;
        }
        
        this._showVolumeHandler();
        this._controls[VideoDashControls.MUTE_UNMUTE].innerText = this._lastAudioIcon;
    }

    _toggleExtraControllsHandler = _ => {
        this._settingsContainer.classList.toggle('show_controller');
    }

    _hideFixResolutionOptions = event => {
        event.stopPropagation();
        if(event.target.tagName === 'DIV') {
            this._controls[VideoDashControls.FIX_RESOLUTION].classList.remove('show_controller');
            return;
        }

        const resolutionStream = event.target.getAttribute('value');
        const resolutions = this._controller.config._resolutionStreams;
        this._isFixed = resolutionStream !== '-1';
        if(this._isFixed) {
            this._fixedResolution = resolutionStream;
            this._labelFixResolution.innerText = resolutions[resolutionStream];
            this._controller.setReproductionQuality(resolutionStream);
        } else {
            this._labelFixResolution.innerText = 'Auto';
            this._controller.setReproductionAutoQuality();
        }
        this._controls[VideoDashControls.FIX_RESOLUTION].classList.remove('show_controller');
    }
    
    _showFixResolutionOptions = event => {
        event.stopPropagation();
        if(this._fixResolutionSelect.children.length){
            this._controls[VideoDashControls.FIX_RESOLUTION].classList.add('show_controller');
            return;
        }
        
        const resolutions = this._controller.config._resolutionStreams;
        resolutions.map((value, index) => {
            const optionRes = document.createElement('ul');
            optionRes.innerText = value;
            optionRes.setAttribute('value', index);
            optionRes.onclick = this._hideFixResolutionOptions;
            this._fixResolutionSelect.appendChild(optionRes);
        });

        const optionRes = document.createElement('ul');
        optionRes.innerText = 'Auto';
        optionRes.setAttribute('value', -1);
        optionRes.onclick = this._hideFixResolutionOptions;
        this._fixResolutionSelect.appendChild(optionRes);
        this._fixResolutionSelect.onmouseleave = this._hideFixResolutionOptions;
        
        this._controls[VideoDashControls.FIX_RESOLUTION].classList.add('show_controller');
    }

    _hideFixSpeedOptions = event => {
        event.stopPropagation();
        if(event.target.tagName === 'DIV') {
            this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED].classList.remove('show_controller');
            return;
        }

        const speed = event.target.getAttribute('value');
        this._reproduction_speed = VideoDashConfiguration.SPEEDS[speed];
        this._labelFixSpeed.innerText = `${this._reproduction_speed}x`;
        this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED].classList.remove('show_controller');
        this._controller.setReproductionSpeed(this._reproduction_speed);
    }
    
    _showFixSpeedOptions = event => {
        event.stopPropagation();
        if(this._fixSpeedSelect.children.length){
            this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED].classList.add('show_controller');
            return;
        }
        
        const resolutions = VideoDashConfiguration.SPEEDS;
        resolutions.map((value, index) => {
            const optionRes = document.createElement('ul');
            optionRes.innerText = value;
            optionRes.setAttribute('value', index);
            optionRes.onclick = this._hideFixSpeedOptions;
            this._fixSpeedSelect.appendChild(optionRes);
        });
        
        this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED].classList.add('show_controller');
    }

    _togglePictureInPicture = _ => {
        if(this._isPictureInPicture)
            return document.exitPictureInPicture();

        this._source.requestPictureInPicture();
    }

    _toggleFullScreen = _ => {
        this._isFullScreen = !this._isFullScreen;
        if(!this._isFullScreen)
            return document.exitFullscreen();

        this._videoComponent.requestFullscreen();
    }
    
    _leaveFullScreen = _ => {
        if(this._isFullScreen && this._isPictureInPicture)
            document.exitPictureInPicture();
    }

    _enterPictureInPicture = _  => {
        if(this._isFullScreen) {
            this._isFullScreen = false;
            document.exitFullscreen();
        }

        this._isPictureInPicture = true;
        this._controller.changeRenderMode(this._isPictureInPicture);
    }

    _leavePictureInPicture = _ => {
        this._isPictureInPicture = false;
        this._controller.changeRenderMode(this._isPictureInPicture);
    }

    _seekTimeline = event => {
        event.stopPropagation();
        if(this._isFullScreen) {
            const { screenX } = event;
            this._timelineThumb.style.width = `${window.screen.width - screenX}px`;
            this._controller.seekToPosition(screenX/window.screen.width);
            return;
        }

        const { x, width } = event.target.getBoundingClientRect();
        const { clientX } = event;
        const thumbWidth = clientX -Math.floor(x);

        this._timelineThumb.style.width = `${thumbWidth}px`;
        this._controller.seekToPosition(thumbWidth/Math.round(width));
    }

    _resizeThumb = _ => {
        const position = this._controller.getPosition();

        if(this._isFullScreen) {
            this._timelineThumb.style.width = `${position*window.screen.width}px`;
            return;
        }

        const { width } = this._timelineController.getBoundingClientRect();
        this._timelineThumb.style.width = `${position*Math.round(width)}px`;
    }

    _initEvents() {
        this._controls[VideoDashControls.PLAY_PAUSE].onclick = this._togglePlayPause;
        this._canvas.onclick = this._togglePlayPause;
        this._controls[VideoDashControls.FAST_FORWARD].onmousedown = this._controller.startFastForward;
        this._controls[VideoDashControls.FAST_FORWARD].onmouseup = this._controller.stopFastForward;
        this._controls[VideoDashControls.FAST_REWIND].onmousedown = this._controller.startFastRewind;
        this._controls[VideoDashControls.FAST_REWIND].onmouseup = this._controller.stopFastRewind;
        this._controls[VideoDashControls.SEEK_FORWARD].onclick = this._controller.seekForward;
        this._controls[VideoDashControls.SEEK_BACKWARD].onclick = this._controller.seekBackward;
        this._controls[VideoDashControls.VOLUME].onchange = this._changeVolumeHandler;
        this._controls[VideoDashControls.MUTE_UNMUTE].onmouseenter = this._showVolumeHandler;
        this._controls[VideoDashControls.MUTE_UNMUTE].onclick = this._muteUnmuteHandler;
        this._volumeControllsContainer.onmouseleave = this._hideVolumeHanlder;
        this._extracontrolsContainer.onclick = this._toggleExtraControllsHandler;
        this._controls[VideoDashControls.FIX_RESOLUTION].onclick = this._showFixResolutionOptions;
        this._fixResolutionSelect.onmouseleave = this._hideFixResolutionOptions;
        this._controls[VideoDashControls.FIX_REPRODUCTION_SPEED].onclick = this._showFixSpeedOptions;
        this._fixSpeedSelect.onmouseleave = this._hideFixSpeedOptions;
        this._controls[VideoDashControls.PICTURE_IN_PICTURE].onclick = this._togglePictureInPicture;
        this._controls[VideoDashControls.FULLSCREEN].onclick = this._toggleFullScreen;
        this._timelineController.onclick = this._seekTimeline;
        document.onfullscreenchange = this._leaveFullScreen;
        setInterval(() => {
            this._resizeThumb();
        }, 10);
    }
  
    disconnectedCallback() {
        console.log("Custom element removed from page.");
    }
  
    adoptedCallback() {
        console.log("Custom element moved to new page."); 
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);
    }

    setController(controller) {
        this._controller = controller;
        this._initEvents();
    }

    getCanvas() {
        return this._canvas;
    }

    createSource = () => {
        this._source = document.createElement("video");
        this._source.autoplay = true;
        this._source.onenterpictureinpicture = this._enterPictureInPicture;
        this._source.onleavepictureinpicture = this._leavePictureInPicture;
        return this._source;
    }
}

export default VideoDash;