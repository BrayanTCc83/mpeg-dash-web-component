import WebmHeader from "./WebMHeader.js";
import DashController from "./DashController.js";
import WebMCue from "./WebMCue.js";

export default class WebMController {
    currentFragment = 0;
    ended = false;
    cueLoaded = false;
    mime = '';

    /**
     * 
     * @param {WebmHeader} header 
     * @param {DashController} DashController 
     */
    constructor(header, DashController) {
        this.header = header;
        this.DashController = DashController;
        this.start = this.header.SegmentStart;
        this.currentFragment = 0;
        this.type = this.header?.tracks?.at(0)?.video ? 'video' : 'audio';
        this.nextBuffer = this.header.content;

        this.makeMime();
    }

    makeMime() {
        const media = this.header?.tracks?.at(0);

        this.mime += this.type;
        this.mime += `/${this.header.docType}; `;
        this.mime += `codecs="${media.codecID.split('_')[1].toLowerCase()}"`;
    }

    async loadCue() {
        const cue = this.header.seeks.find( seek => seek.id === 0x1C53BB6B );
        const cuePosition = cue.position + this.header.SegmentStart;
        await (
            this.type === 'audio' ?
            this.DashController._fetchAudio(this.fetchData, `${cuePosition}-${this.header.FileTotalBytes - 1}`) :
            this.DashController._fetchVideo(this.fetchData, `${cuePosition}-${this.header.FileTotalBytes - 1}`)
        )
            .then( res => res.arrayBuffer() )
            .then( buffer => WebMCue.parse(buffer) )
            .then( cue => {
                this.cueLoaded = true;
                this.cue = cue;
            }).catch( () => {
                setTimeout(() => {
                    this.loadCue();
                }, 500);
            });
    }

    timestamp = 0;

    seek() {
        this.timestamp = this.DashController.htmlSource.currentTime * 1_000_000_000 / this.header.timecodeScale;
    }

    isAtEnd() {
        if(!this.cue) return false;

        return false;
    }

    getNextFragment() {
        let currentIndex = this.cue.CuePoints.findIndex( ({CueTime}) => CueTime > this.timestamp );
        if(currentIndex === 0) currentIndex++;
        else if(currentIndex < 0) currentIndex = 1;
        const current = this.cue.CuePoints[currentIndex - 1];
        const next = currentIndex < this.cue.CuePoints.length - 1 ? this.cue.CuePoints[currentIndex] : null;

        this.timestamp = next?.CueTime ?? this.DashController.htmlSource.duration * 1_000_000_000 / this.header.timecodeScale;
        this.current = this.start + current.CueTrackPositions[0].CueClusterPosition;
        this.next = next !== null ? (this.start + this.header.SegmentLength - 1 ) : 
            ( this.start + next.CueTrackPositions[0].CueClusterPosition - 1 );
    }

    currentCluster;
    getCurrentTimestamp() {
        return this.currentCluster?.Timestamp / this.header.timecodeScale ?? 0;
    }

    fetchData = {};
    setFetchData( fetchData ) {
        this.fetchData = fetchData;
    }

    async fetch() {
        this.getNextFragment();
        const range = `${this.current}-${this.next}`;
        
        if (this.type === 'audio') {
            return this.DashController._fetchAudio(this.fetchData, range);
        } else if (this.type === 'video') {
            return this.DashController._fetchVideo(this.fetchData, range);
        } else {
            throw new Error("Error al manejar el archivo webm, formato no soportado.");
        }
    }

    async nextTrack() {
        if(this.isAtEnd() || this.DashController.htmlSource.paused){
            return;
        }

        if(!this.type) {
            return;
        }

        if(!this.cueLoaded) {
            await this.loadCue();
        }
        
        return this.fetch();
    }
}