/**
 * Contiene todos los posibles controles que admite el controlador de vídeo.
 */
class VideoDashControls {
    /**
     * Define el control para reproducir y pausar el vídeo.
     * @type {string}
     */
    static PLAY_PAUSE               = "playPause";
    /**
     * Define el control para retrasar el vídeo.
     * @type {string}
     */
    static SEEK_BACKWARD            = "seekBackward";
    /**
     * Define el control para adelantar el vídeo.
     * @type {string}
     */
    static SEEK_FORWARD             = "seekForward";
    /**
     * Define el control para regresar rápidamente por el vídeo.
     * @type {string}
     */
    static FAST_REWIND              = "fastRewind";
    /**
     * Define el control para avanzar rápidamente por el vídeo.
     * @type {string}
     */
    static FAST_FORWARD             = "fastForward";
    /**
     * Define el control para cambiar el volumen del vídeo.
     * @type {string}
     */
    static VOLUME                   = "volume";
    /**
     * Define el control para mutear y desmutear el vídeo.
     * @type {string}
     */
    static MUTE_UNMUTE              = "muteUnmute";
    /**
     * Define el control para mostrar el vídeo en pantalla completa.
     * @type {string}
     */
    static FULLSCREEN               = "fullscreen";
    /**
     * Define el control para reproducir el vídeo en modo picture.
     * @type {string}
     */
    static PICTURE_IN_PICTURE       = "pictureInPicture";
    /**
     * Define el control para fijar la resolución de carga del vídeo.
     * @type {string}
     */
    static FIX_RESOLUTION           = "fixResolution";
    /**
     * Define el control para fijar la velocidad de reproducción el vídeo.
     * @type {string}
     */
    static FIX_REPRODUCTION_SPEED   = "fixReproductionSpeed";
    /**
     * Define el control para el menú de configuración.
     * @type {string}
     */
    static SETTINGS   = "settings";
}

export default VideoDashControls;