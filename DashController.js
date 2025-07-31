import WebmHeader from "./WebMHeader.js";
import WebMController from "./WebMController.js";
import VideoDashController from "./VideoDashController.js";
import VideoDashConfiguration from "./VideoDashConfiguration.js";
import { AudioController, MultipleVideoController } from "./Controllers.js";

export default class DashController {
    _fixedResolution = -1;
    _videoRepresentation = [];
    _audioRepresentation = [];
    _audioBuffer = {};
    _videoBuffer = {};
    /**
     * @type {Object[]}
     */
    _representation;
    /**
     * @type {Object[]} 
     */
    _headerVideoProperties = [];
    _headerAudioProperties = [];
    _headerTextProperties = [];
    /**
     * @type {Object[]} 
     */
    _videoUrlParams = [];
    _audioUrlParams = [];
    _textUrlParams = [];
    /**
     * @type {string[]}
     */
    _requestMediaType = [];
    _manifest;
    config;

    /**
     * 
     * @param {VideoDashConfiguration} configuration
     * @param {VideoDashController} videoDashController 
     */
    constructor(configuration, videoDashController) {
        this.config = configuration;
        this.videoDashController = videoDashController;
        this.htmlSource = videoDashController._source;
        this.isMetadataAppended = false;
    }
        
    _loadManifest = async _ => {
        if(this._manifest){
            return;
        }

        const data = {
            method: 'GET',
            headers: this.config._customHeaders?.headers?.manifest || {}
        };

        switch(this.config._authorization) {
            case 'include': {
                data.credentials = 'include';
                break;
            }
            case 'baerer': {
                data.headers.Authorization = `Baerer ${this.config.token}`
                break;
            }
        }

        await fetch(this.config._manifestUrl, data).then( res => {
            return res.text();
        }).then( xml => {
            this._manifest = xml;
            return new window.DOMParser().parseFromString(xml, "text/xml");
        }).then( manifest => {
            const AdaptationSet = manifest.getElementsByTagName('AdaptationSet');
            this._videoRepresentation = Array.from(AdaptationSet[0].getElementsByTagName('Representation'));
            this._audioRepresentation = AdaptationSet[1].getElementsByTagName('Representation')[0];
            
            const initRangeV = this._audioRepresentation.getElementsByTagName('Initialization')[0].getAttribute('range');
            this._audioBuffer = { 
                range: { 
                    init: initRangeV,
                    increment: Number(initRangeV.split('-')[1]),
                    current: 0,
                    size: null
                },
                buffer: []
            };
            
            this._videoBuffer = {range: {}, buffers: {}};
            const resolutions = this._videoRepresentation.map( (Representation) => {
                const resolution = `${Representation.getAttribute('width')}x${Representation.getAttribute('height')}`;
                const initRange = Representation.getElementsByTagName('Initialization')[0].getAttribute('range');
                this._videoBuffer.range[resolution] = { 
                    init: initRange,
                    increment: Number(initRange.split('-')[1]),
                    current: 0,
                    size: null
                };
                this._videoBuffer.buffers[resolution] = [];
                return resolution;
            });
            this.config.setResolutionStreams(resolutions);
        });
    }

    _initPlayer = async () => {
        const videos = await Promise.all(Object.entries(this._videoBuffer.range).map( ([resolution, config]) => {
            this.resolution = resolution;
            return Promise.resolve(this._fetchVideo({resolution}, config.init)
                .then( res => res.arrayBuffer())
                .then( buffer => WebmHeader.parse(buffer) )
                .then( webm => {
                    const video = new WebMController(webm, this)
                    video.setFetchData({ resolution });
                    return video;
                }));
        }));

        const audio = await this._fetchAudio({}, this._audioBuffer.range.init)
            .then( res => res.arrayBuffer())
            .then( buffer => WebmHeader.parse(buffer) )
            .then( webm => new WebMController(webm, this) );
        
        videos.forEach( video => video.loadCue() );
            
        this.videoController = new MultipleVideoController(videos, this);
        this.audioController = new AudioController(audio);
    }

    _fetchVideo = async (data, range) => {
        let headers = JSON.stringify(this.config._customHeaders?.headers?.video || {});
        Object.entries(this.config._customHeaders?.properties?.video || {}).forEach( ([key, [field, fun]]) => {
            headers = headers.replaceAll(`{${key}}`, fun(data[field]))
        });

        const fetchData = {
            method: 'GET',
            headers: {
                ...(JSON.parse(headers) || {}),
                'Range': `bytes=${range}`
            }
        };

        switch(this.config._authorization) {
            case 'include': {
                fetchData.credentials = 'include';
                break;
            }
            case 'baerer': {
                fetchData.headers.Authorization = `Baerer ${this.config.token}`
                break;
            }
        }
        return fetch(this.config._defaultUrl, fetchData);
    }

    _fetchAudio = async (data, range) => {
        let headers = JSON.stringify(this.config._customHeaders?.headers?.audio || {});
        Object.entries(this.config._customHeaders?.properties?.audio || {}).forEach( ([key, [field, fun]]) =>{
            headers = headers.replaceAll(`{${key}}`, fun(data[field]))
        });

        const fetchData = {
            method: 'GET',
            headers: {
                ...(JSON.parse(headers) || {}),
                'Range': `bytes=${range}`
            }
        };

        switch(this.config._authorization) {
            case 'include': {
                fetchData.credentials = 'include';
                break;
            }
            case 'baerer': {
                fetchData.headers.Authorization = `Baerer ${this.config.token}`
                break;
            }
        }
        return fetch(this.config._defaultUrl, fetchData);
    }

    setFixedResolution(resolution) {
        this._fixedResolution = resolution;
    }

    setVideoBuffer() {
        const track = this.videoController.controllers[0];
        this.videoSourceBuffer = this.mediaSource.addSourceBuffer(track.mime);
        this.videoSourceBuffer.appendBuffer(track.nextBuffer);
        track.nextBuffer = null;

        this.videoSourceBuffer.onupdateend = () => {
            if (this.videoSourceBuffer.buffered.length === 0) {
                this.videoSourceBuffer.appendWindowEnd = this.mediaSource.duration;
            }

            this.videoController.notify();
        };
    }

    setAudioBuffer() {
        const track = this.audioController.controller;
        this.audioSourceBuffer = this.mediaSource.addSourceBuffer(track.mime);
        this.audioSourceBuffer.appendBuffer(track.nextBuffer);
        track.nextBuffer = null;

        this.audioSourceBuffer.onupdateend = () => {
            if (this.audioSourceBuffer.buffered.length === 0) {
                this.audioSourceBuffer.appendWindowEnd = this.mediaSource.duration;
            }

            this.audioController.notify();
        };
    }

    processNextBuffer(webController) {
        const source = webController.type === 'audio' ? this.audioSourceBuffer : this.videoSourceBuffer;
        if (source.updating || !webController.nextBuffer) {
            return;
        }

        if (this.mediaSource.readyState === 'open' && !source.updating) {
            try {
                source.appendBuffer(webController.nextBuffer);
                webController.prevBuffer = webController.nextBuffer;
                webController.nextBuffer = null;
            } catch (error) {}
        }
    }

    update(webController) {
        this.processNextBuffer(webController);
    }

    seek(newTimestamp) {
        this.videoController.seek();
        this.audioController.seek();
    }

    start() {
        this.mediaSource = new MediaSource();
        this.htmlSource.src = URL.createObjectURL(this.mediaSource);

        this.mediaSource.addEventListener('sourceopen', () => {
            if (this.htmlSource.src) {
                URL.revokeObjectURL(this.htmlSource.src);
            }
            if (this.mediaSource.sourceBuffers.length === 0) {
                this.setAudioBuffer();
                this.setVideoBuffer();
            }
        });
        
        this.audioController.addObserver(this);
        this.audioController.setSource(this.audioSourceBuffer);
        this.audioController.startStream(this.mediaSource);
        this.videoController.addObserver(this);
        this.videoController.setSource(this.videoSourceBuffer);
        this.videoController.startStream(this.mediaSource);
    }
}