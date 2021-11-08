
import './lib/webaudio-controls.js';

const getBaseURL = () => {
    return new URL('.', import.meta.url);
};

let ctx = window.AudioContext || window.webkitAudioContext;
let audioContext, FreqContext;
let player, pannerSlider, pannerNode;
let sourceNode, filters;



let style = `
figure {
    max-width:80%;
    width:100%;
    max-height:80%;
    height:100%;
    margin:1.25rem auto;
    padding:1.051%;
 }

 #player {
     width: 50%;
     display: block;
     margin: 0 auto;

 }


.controls {
    width:100%;
    height:8.0971659919028340080971659919028%; /* of figure's height */
    position:relative;
 }

.controls > * {
    float:left;
    width:3.90625%;
    height:100%;
    margin-left:0.1953125%;
    display:block;
 }
 

 .controls .progress {
    cursor:pointer;
    width: 70%;
 }

 progress[value] {
    appearance: none; /* Needed for Safari */
    border: none; /* Needed for Firefox */
    color: #f59842; /* Fallback to a solid color */
  }



 .controls button {
    border:none;
    cursor:pointer;
    background:transparent;
    background-size:contain;
    background-repeat:no-repeat;
 }

 .controls button:hover, .controls button:focus {
    opacity:0.5;
 }

 .controls progress {
    display:block;
    width:100%;
    height:10%;
    margin-top:1.6rem;
    border:none;
    border-radius:2px;
 }

 .controls progress span {
    width:0%;
    height:100%;
    display:inline-block;
    background-color:#558055;
 }

 .controls progress[data-state="fake"] {
    background:#e6e6e6;
    height:65%;
 }

 #volume {
     padding: 1% 0;
 }

 .fas {
     color: #ff5752;
 }

 #vitesse4 {
    font-family: 'Fredoka One', cursive;
    font-size: 24px;
    color: #ff5752;
 }

 .infoControls {
    margin: 0 auto;
    width: 100%;
    border-radius: 3px;
    color: #ff5752;
    font-family: 'Fredoka One';
}

`;
let template = /*html*/
` 
<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.4/css/all.css" integrity="sha384-DyZ88mC6Up2uqS4h/KRgHuoeGwBcD4Ng9SiP4dIRy0EXTlnuz47vAwmeGwVChigm" crossorigin="anonymous">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" rel="stylesheet"><figure>
    <video id="player" crossorigin="anonymous">
        <br>
    </video>
    <br>
    <div class="controls">
        <button id="play" data-state="play">
            <i  id="playButton" class="fas fa-play-circle fa-2x"></i>
        </button>
        <div class="progress">
            <progress id="progress" value="0" max="48">
                <span id="progress-bar"></span>
            </progress>
        </div>
        <button id="info">
            <i class="fas fa-info-circle fa-2x"></i>
        </button>
        <button id="recule10">
            <i class="fas fa-backward fa-2x"></i>
        </button>
        <button id="avance10">
            <i class="fas fa-forward fa-2x"></i>
        </button>
        <button id="reboot">
            <i class="fas fa-redo fa-2x"></i>
        </button>
        <button id="vitesse4">x4</button>
        <webaudio-knob id="volume" min=0 max=1 src="./assets/LittlePhatty.png" sprites="100" diameter="30" tooltip="%s" value=0.5 step="0.01"> </webaudio-knob>
    </div>
    <br>
    <div class="infoControls">
        <p id="infotxt"></p>
        <label for="pannerSlider">Balance</label>
        <input type="range" min="-1" max="1" step="0.1" value="0" id="pannerSlider" />
        <br>
        <label>60Hz</label>
        <input type="range" value="0" step="1" min="-30" max="30" id="frequence0"></input>
        <br>
        <label>170Hz</label>
        <input type="range" value="0" step="1" min="-30" max="30" id="frequence1"></input>
        <br>
        <label>350Hz</label>
        <input type="range" value="0" step="1" min="-30" max="30" id="frequence2"></input>
        <br>
        <label>1000Hz</label>
        <input type="range" value="0" step="1" min="-30" max="30" id="frequence3"></input>
    </div>
  </figure>
  `;

class MyVideoPlayer extends HTMLElement {
    constructor() {
        super();


        console.log("BaseURL = " + getBaseURL());

        this.attachShadow({ mode: "open" });
    }

    fixRelativeURLs() {
        // pour les knobs
        let knobs = this.shadowRoot.querySelectorAll('webaudio-knob, webaudio-switch, webaudio-slider');
        knobs.forEach((e) => {
            let path = e.getAttribute('src');
            e.src = getBaseURL() + '/' + path;
        });
    }
    connectedCallback() {
        // Appelée avant affichage du composant
        //this.shadowRoot.appendChild(template.content.cloneNode(true));
		this.shadowRoot.innerHTML = `<style>${style}</style>${template}`;
        
        this.fixRelativeURLs();

        this.player = this.shadowRoot.querySelector("#player");
        // récupération de l'attribut HTML
        this.player.src = this.getAttribute("src");

        // déclarer les écouteurs sur les boutons
        this.definitEcouteurs();

        this.progressLoop();



        /* CONTEXT */ 
        audioContext = new ctx();
        sourceNode = audioContext.createMediaElementSource(player);

        
        /* BALANCE */ 
        // the audio element
        player = this.shadowRoot.querySelector('#player');
        player.onplay = (e) => {audioContext.resume();}

        this.buildAudioGraphPanner();

        pannerSlider = this.shadowRoot.querySelector('#pannerSlider');
        // input listener on the gain slider
        pannerSlider.oninput = function(evt) {
            console.log(evt.target.value);
            pannerNode.pan.value = evt.target.value;
        };
        /* BALANCE */


        /* FREQUENCE */ 
        
        filters = [];
        [60, 170, 350, 1000].forEach(function(freq, i) {
            var eq = audioContext.createBiquadFilter();
            eq.frequency.value = freq;
            eq.type = "peaking";
            eq.gain.value = 0;
            filters.push(eq);
          });

        this.buildFrequence();
      


    }

    //Ecouteur
    definitEcouteurs() {
        console.log("ecouteurs définis")
        let vitesseBool = false;
        let isPlaying = false;
        let playButton = this.shadowRoot.querySelector("#playButton");
        let texte = this.shadowRoot.querySelector("#infotxt");
        player = this.shadowRoot.querySelector("#player");
        texte.innerHTML = "Durée de la vidéo : " + this.player.duration + "<br>Temps courant : " + this.player.currentTime + "<br>Vitesse de lecture : " + this.player.playbackRate;
        

        this.shadowRoot.querySelector("#play").onclick = () => {
            if(!isPlaying) {
                isPlaying = true;
                this.play();
                playButton.classList.remove("fa-play-circle");
                playButton.classList.add("fa-pause-circle");
                console.log(this.player.duration);
            }
            else {
                isPlaying = false;
                this.pause();
                playButton.classList.add("fa-play-circle");
                playButton.classList.remove("fa-pause-circle");
            }

        }
        
        window.onkeyup = (e) => {
            if(e.keyCode == 32) {
                if(!isPlaying) {
                    this.play();
                    isPlaying = true;
                    playButton.classList.remove("fa-play-circle");
                    playButton.classList.add("fa-pause-circle");
                }
                else{
                    this.pause();
                    isPlaying = false;
                    playButton.classList.add("fa-play-circle");
                    playButton.classList.remove("fa-pause-circle");
                }
            }
        }

        window.onkeydown = (e) => {
            if(e.keyCode == 32) {
                this.pause();
            }
        }

        this.shadowRoot.querySelector("#frequence0").oninput = (event) => {
            this.changeGain(event.target.value, 0);
        }

        this.shadowRoot.querySelector("#frequence1").oninput = (event) => {
            this.changeGain(event.target.value, 1);
        }

        this.shadowRoot.querySelector("#frequence2").oninput = (event) => {
            this.changeGain(event.target.value, 2);
        }

        this.shadowRoot.querySelector("#frequence3").oninput = (event) => {
            this.changeGain(event.target.value, 3);
        }

        this.shadowRoot.querySelector("#volume").oninput = (event) => {
            const vol = parseFloat(event.target.value);
            this.player.volume = vol;
        }

        this.shadowRoot.querySelector("#avance10").onclick = () => {
            this.avance10();
        }
        
        this.shadowRoot.querySelector("#recule10").onclick = () => {
            this.recule10();
        }
        
        this.shadowRoot.querySelector("#reboot").onclick = () => {
            this.reboot();
        }
        
        this.shadowRoot.querySelector("#info").onclick = () => {
            this.getInfo();
        }
        
             
        this.shadowRoot.querySelector("#vitesse4").onclick = () => {
            if(vitesseBool == false) {
                this.vitesse(4);
                this.shadowRoot.querySelector("#vitesse4").textContent = "x1";
                vitesseBool = true;
            }
            else {
                this.vitesse(1);
                this.shadowRoot.querySelector("#vitesse4").textContent = "x4";
                vitesseBool = false;
            }
        }


    }

    // API de mon composant
    play() {
        this.player.play();
    }

    pause() {
        this.player.pause();
    }

    avance10() {
        this.player.currentTime += 10;
    }    
    
    recule10() {
        this.player.currentTime -= 10;
    }

    reboot() {
        this.player.currentTime = 0;
    }

    getInfo() {
        let texte = this.shadowRoot.querySelector("#infotxt");
        texte.innerHTML = "";
        texte.innerHTML = "Durée de la vidéo : " + this.player.duration + "<br>Temps courant : " + this.player.currentTime + "<br>Vitesse de lecture : " + this.player.playbackRate;       
    }

    vitesse(speed) {
        this.player.playbackRate = speed;
    }

    progressLoop() {
        let progress = this.shadowRoot.querySelector("#progress");
        let player = this.shadowRoot.querySelector("#player");
        setInterval(function() {
            progress.value = player.currentTime;
        });
        
    }

    buildAudioGraphPanner() {
        // create source and gain node
        pannerNode = audioContext.createStereoPanner();

        // connect nodes together
        sourceNode.connect(pannerNode);
        pannerNode.connect(audioContext.destination);
    }

    buildFrequence() {
        sourceNode.connect(filters[0]);
        for(var i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i+1]);
        }
        filters[filters.length - 1].connect(audioContext.destination);

    }

    changeGain(sliderVal,nbFilter) {
        var value = parseFloat(sliderVal);
        filters[nbFilter].gain.value = value;
        
        // update output labels
        //var output = document.querySelector("#gain"+nbFilter);
        //output.value = value + " dB";
    }

}



customElements.define("my-player", MyVideoPlayer);