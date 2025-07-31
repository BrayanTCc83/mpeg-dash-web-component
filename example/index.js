import { VideoDashConfiguration, VideoDashController } from '../index.js'

const HOST = "http://localhost:4000";

const loadVideoDash = () => {
    const VIDEO_ID = 1;
    const URL = `${HOST}/tema/${VIDEO_ID}/recurso`;

    const dashConfiguration = new VideoDashConfiguration();

    dashConfiguration.setAuthorization('include');
    dashConfiguration.setServer(HOST);
    dashConfiguration.setDefaultUrl(URL);

    dashConfiguration.setCustomHeaders('manifest', {
        'Accept': 'application/dash+xml'
    });

    dashConfiguration.setCustomHeaders('video', {
        'Accept': 'video/webm;format=vp9@{resolution}'
    }, {
        resolution: ['resolution', (resolution) => resolution.split('x')[1]]
    });

    dashConfiguration.setCustomHeaders('audio', {
        'Accept': 'audio/webm'
    });

    const videoDashController = new VideoDashController("video-dash", dashConfiguration);
    videoDashController.start();
}

const btn_inciar_sesion = document.getElementById("btn_inciar_sesion");
btn_inciar_sesion.addEventListener('click', () => {
    fetch(`${HOST}/sesion`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user: 'video-dash',
            password: '12345678'
        }),
        credentials: 'include'
    })
        .then( () => loadVideoDash() )
});