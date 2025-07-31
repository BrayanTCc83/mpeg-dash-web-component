export class BufferQueue {
    queue = [];

    push(buffer) {
        this.queue.push(new Uint8Array(buffer));
    }

    /**
     * 
     * @returns {Uint8Array}
     */
    shift() {
        return this.queue.shift();
    }

    isEnd() {
        return this.queue.length === 0;
    }
}

export class MultipleVideoController {
    /**
     * 
     * @param {WebMController[]} controllers 
     */
    constructor(controllers, dash) {
        this.controllers = controllers.sort((controllerA, controllerB) => controllerB.header.tracks[0].video.pixelHeight - controllerA.header.tracks[0].video.pixelHeight);
        this.type = 'video';
        this.dash = dash;
    }

    _end = false;
    observers = [];
    addObserver(o) {
        this.observers.push(o);
    }

    notify() {
        this.observers.forEach(o => o.update(this));
    }

    sourceBuffer = null;
    prevBuffer = null;
    nextBuffer = null;
    bufferQueue = new BufferQueue();
    addBuffer(buffer) {
        this.bufferQueue.push(buffer);

        if (!this.nextBuffer && !this.sourceBuffer?.updating) {
            this.nextBuffer = this.bufferQueue.shift();
            this.notify();
        }
    }

    seek() {
        this.controllers.forEach( controller => controller.seek() );
    }

    /**
     * 
     * @param {SourceBuffer} sourceBuffer 
     */
    setSource(sourceBuffer) {
        this.sourceBuffer = sourceBuffer;
    }

    isAtEnd() {
        return this._end;
    }

    selectQuality() {
        if (this.averageBandwidth > 15_000 && this.latency < 80) return 2160;
        if (this.averageBandwidth > 5_000 && this.latency < 150) return 1080;
        if (this.averageBandwidth > 2_500 && this.latency < 250) return 720;
        if (this.averageBandwidth > 1_000 && this.latency < 400) return 480;
        if (this.averageBandwidth > 500 && this.latency < 600) return 360;
        if (this.averageBandwidth > 200 && this.latency < 800) return 180;
        return 90; // Para condiciones extremas
    }

    addaptVideo() {
        const quality = this.selectQuality();
        
        this.currentVideo = this.controllers.find( controller => controller.header.tracks[0].video.pixelHeight <= quality );
    }

    async nextTrack(delay = 0) {
        if (this.isAtEnd()) {
            return;
        }

        if(this.mediaSource.sourceBuffers.length === 0) {
            setTimeout(() => {
                this.nextTrack();
            }, 500);
        }

        if(this.dash._fixedResolution !== -1){
            this.currentVideo = this.controllers[this.controllers.length - this.dash._fixedResolution - 1];
        }

        const performanceStart = performance.now();
        this.currentVideo.nextTrack()
            .then( res => {
                if(res === undefined) {
                    throw new Error('');
                }
                const performanceEnd = performance.now();
                this.latency = performanceEnd - performanceStart;
                return res.arrayBuffer();
            })
            .then( buffer => {
                const bandwidth = (buffer.byteLength * 8) / this.latency;
                this.historyBandwidth.push(bandwidth);
                this.averageBandwidth = this.historyBandwidth.reduce((a, b) => a + b) / this.historyBandwidth.length;

                const newDelay = this.latency < 200 ? 100 : 500;

                this.addBuffer(buffer);
                
                if(this.dash._fixedResolution === 1) {
                    this.addaptVideo();
                }
                setTimeout(() => {
                    this.nextTrack(newDelay);
                }, delay);
            })
            .catch( err => {
                setTimeout(() => {
                    this.nextTrack();
                }, 500);
            });
    }

    historyBandwidth = [];
    bufferQueue = new BufferQueue();
    startStream(mediaSource) {
        this.currentVideo = this.controllers[this.controllers.length - 1];
        this.mediaSource = mediaSource;
        this.nextTrack();
    }
}

export class AudioController {
    /**
     * 
     * @param {WebMController} controller 
     */
    constructor(controller) {
        this.controller = controller;
        this.type = 'audio';
    }

    seek() {
        this.controller.seek();
    }

    observers = [];
    addObserver(o) {
        this.observers.push(o);
    }

    notify() {
        this.observers.forEach(o => o.update(this));
    }

    sourceBuffer = null;
    prevBuffer = null;
    nextBuffer = null;
    bufferQueue = new BufferQueue();
    addBuffer(buffer) {
        this.bufferQueue.push(buffer);

        if (!this.nextBuffer && !this.sourceBuffer?.updating) {
            this.nextBuffer = this.bufferQueue.shift();
            this.notify();
        }
    }

    /**
     * 
     * @param {SourceBuffer} sourceBuffer 
     */
    setSource(sourceBuffer) {
        this.sourceBuffer = sourceBuffer;
    }

    async nextTrack(delay = 0) {
        if (this.controller.isAtEnd()) {
            return;
        }

        if(this.mediaSource.sourceBuffers.length === 0) {
            setTimeout(() => {
                this.nextTrack();
            }, 500);
        }

        const performanceStart = performance.now();
        this.controller.nextTrack()
            .then( res => {
                if(res === undefined) {
                    throw new Error('');
                }
                const performanceEnd = performance.now();
                this.latency = performanceEnd - performanceStart;
                return res.arrayBuffer();
            } )
            .then( buffer => {
                const newDelay = this.latency < 200 ? 100 : 500;
                this.addBuffer(buffer);
                setTimeout(() => {
                    this.nextTrack(newDelay);
                }, delay);
            })
            .catch( err => {
                setTimeout(() => {
                    this.nextTrack();
                }, 500);
            });
    }

    historyBandwidth = [];
    bufferQueue = new BufferQueue();
    startStream(mediaSource) {
        this.mediaSource = mediaSource;
        this.nextTrack();
    }
}