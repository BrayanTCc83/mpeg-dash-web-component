class VideoDashConfiguration {
    static SPEEDS = [
        0.2, 0.5, 1, 1.5, 2, 3
    ];
    static DEFAULT_SPEED = 2;

    /**
     * @typedef { 'noauth'|'baerer'|'include' } DashAuthorization
     */

    /**
     * @type {VideoDashController}
     */
    _controller;
    _isVideoConfig = false;
    _isAudioConfig = false;
    _isTextConfig = false;
    _videoEndpointConfig = {};
    _audioEndpointConfig = {};
    _textEndpointConfig = {};
    _videoControlls = {};
    _thumbnail;
    _autoplay;
    _server;
    _manifestUrl;
    _timelineBegin;
    _trial;
    _defaultUrl;
    _authorization = 'noauth';
    _roaming = 2000;
    _maxTime = 10;
    _frameRate = 30;
    _customHeaders = {
        headers: {},
        properties: {}
    };
    /**
     * @type {string[]}
     */
    _resolutionStreams;

    setController(controller) {
        this._controller = controller;
    }
    setServer(server) {
        this._server = server;
    }
    setManifestUrl(url) {
        this._manifestUrl = url;
        this._controller._setManifest();
    }
    setVideoEndpoint(endpoint, params) {
        this._isVideoConfig = true;
        this._videoEndpointConfig = { endpoint, params };
    }
    setAudioEnpoint(endpoint, params) {
        this._isAudioConfig = true;
        this._audioEndpointConfig = { endpoint, params };
    }
    setTextEndpoint(endpoint, params) {
        this._isTextConfig = true;
        this._textEndpointConfig = { endpoint, params };
    }
    disableControl(control) {
        this._videoControlls[control] = false;
    }
    disableControls(controls) {
        for(const control of controls) {
            this._videoControlls[control] = false;
        }
    }
    enableControl(control) {
        this._videoControlls[control] = true;
    }
    enableControls(controls) {
        for(const control of controls) {
            this._videoControlls[control] = true;
        }
    }
    setThumbnail(thumbnail) {
        this._thumbnail = thumbnail;
    }
    setTimelineBegin(milis) {
        this._timelineBegin = milis;
    }
    setTrial(milis) {
        this._trial = milis;
    }
    setDefaultUrl(url) {
        this._defaultUrl = url;
        this._manifestUrl = url;
    }
    setCustomHeaders(type, headers, properties) {
        this._customHeaders.headers[type] = headers;
        if(properties) {
            this._customHeaders.properties[type] = properties;
        }
    }
    setResolutionStreams(resolutionStreams) {
        this._resolutionStreams = resolutionStreams;
    }
    applyConfiguration() {
        this._controller.initController();
    }
    /**
     * 
     * @param {DashAuthorization} authorization 
     */
    setAuthorization(authorization) {
        this._authorization = authorization;
    }
    setToken(token) {
        this.token = token;
    }
    /**
     * 
     * @param {Number} maxTime 
     */
    setMaxTime(maxTime) {
        if(Number.parseInt(`${maxTime}`) !== maxTime) {
            throw new Error("El número debe ser un valor entero.");
        }
        this._maxTime = maxTime;
    }
    setFrameRate(frameRate) {
        this._frameRate = frameRate;
    }
}

export default VideoDashConfiguration;