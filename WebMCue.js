export default class WebMCue {
    static parse(buffer) {
        return new WebMCue(buffer);
    }

    constructor(buffer) {
        this.content = buffer;
        this.__offset = 0;

        const dataView = new DataView(buffer);
        
        this.get_matroska_cue_stats(dataView);
        this.get_matroska_cue_points(dataView);
    }

    /**
     * 
     * @param {DataView} dataView 
     */
    get_matroska_cue_stats(dataView) {
        const element = this.readVint(dataView, this.__offset);

        if(element.id !== 0x1c53bb6b) {
            throw new Error("Elemento cue inválido.");
        }
        
        this.__offset += element.bytes;
        this.CueId = element.id;

        const size = this.readVint(dataView, this.__offset);
        this.__offset += size.bytes;
        this.CueSize = size.value;
    }

    __current_point = -1;
    __current_track_position = -1;
    CuePoints = [];
    /**
     * 
     * @param {DataView} dataView 
     */
    get_matroska_cue_points(dataView) {
        let end = this.__offset + this.CueSize;
        
        while (this.__offset < end) {
            const element = this.readVint(dataView, this.__offset);
            this.__offset += element.bytes;
    
            const size = this.readVint(dataView, this.__offset);
            this.__offset += size.bytes;
    
            switch (element.id) {
                case 0xBB: { // CuePoint
                    this.__current_point++;
                    this.__current_track_position = -1;
                    this.CuePoints.push({});
                    this.CuePoints[this.__current_point].CueTrackPositions = [];
                    break;
                }
                case 0xB3: { // CueTime
                    this.CuePoints[this.__current_point].CueTime = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xB7: { // CueTrackPositions
                    this.__current_track_position++;
                    this.CuePoints[this.__current_point].CueTrackPositions.push({});
                    this.CuePoints[this.__current_point].CueTrackPositionsSize = size.value;
                    this.get_matroska_cue_track_positions(dataView, size.value);
                    break;
                }
            }
        }
    }

    get_matroska_cue_track_positions(dataView, size) {
        this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position].CueReference = [];
        let end = this.__offset + size;
        let cue_reference = -1;
        
        while (this.__offset < end) {
            const element = this.readVint(dataView, this.__offset);
            this.__offset += element.bytes;
    
            const size = this.readVint(dataView, this.__offset);
            this.__offset += size.bytes;
    
            switch (element.id) {
                case 0xF7: { // CueTrack
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .Track = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xF1: { // CueClusterPosition
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueClusterPosition = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xF0: { // CueRelativePosition
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueRelativePosition = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xB2: { // CueDuration
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueDuration = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0x5378: { // CueBlockNumber
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueBlockNumber = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xEA: { // CueCodecState
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueCodecState = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
                case 0xDB: { // CueReference
                    cue_reference++;
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueReference.push({});
                    this.__offset += size.value;
                    break;
                }
                case 0x96: { // CueRefTime
                    this.CuePoints[this.__current_point].CueTrackPositions[this.__current_track_position]
                        .CueReference[cue_reference].CueRefTime = this.readUint(dataView, size.value);
                    this.__offset += size.value;
                    break;
                }
            }
        }
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} __offset 
     */
    readVint(dataView, __offset) {
        let firstByte = dataView.getUint8(__offset);
        let mask = 0x80;
        let bytes = 1;
    
        while (!(firstByte & mask) && mask > 0) {
            mask >>= 1;
            bytes++;
        }
    
        if (bytes > 8) {
            throw new Error("VINT demasiado grande.");
        }

        let sub = new Uint8Array(dataView.buffer.slice(__offset, __offset + bytes));
        let id = 0;
        let value = 0;
        sub.forEach((element, index) => {
            id <<= 8;
            id += element;
            value <<= 8;
            if(index === 0) {
                value += element ^ mask;
            } else {
                value += element;
            }
        });
        if(id < 0){
            id = id >>> 0;
            value = value >>> 0;
        }
        return { id, value, bytes };
    }

    /**
     * 
     * @param {DataView} dataView 
     * @param {Number} count 
     */
    readUint(dataView, count) {
        let value = 0;
        for(let i = 0; i < count; i++) {
            value <<= 8;
            value += dataView.getUint8(this.__offset + i);
        }
        return value;
    }
}