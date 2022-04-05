import './../../style/htmlPanel.scss'

import * as d3Selection from 'd3-selection';
import * as d3Timer from 'd3-timer';
import * as d3Dispatch from 'd3-dispatch';
import {HtmlComponent} from "./html.component";

const d3=Object.assign({},d3Selection,d3Timer,d3Dispatch);



class HtmlPanel extends HtmlComponent{

    static type='_Panel';
    static defaultOptions = { anchor: 'right', width: '70%', height:'98%', handleWidth:'8%', initialPosition: 'folded', duration: 1000, delay:0, timer:100000  };

    /**
     * CONSTRUCTEUR
     * Crée un panneau latéral amovible
     *
     * @param {String} id                      Identifiant
     * @param {Object} options={}              Options:
     * @param {String} options.anchor               Ancrage (right par défaut)
     * @param {String} options.width                Largeur du panneau en % de l'élement parent
     * @param {String} options.height               Hauteur du panneau en % de l'élement parent
     * @param {String} options.handleWidth          Largeur de la poignée en % du panneau
     * @param {String} options.initialPosition      Position initiale (folded ou unfolded)
     * @param {Number} options.duration             Durée des transitions
     * @param {Number} options.delay                Délai des transitions
     * @param {Number} options.timer                Délai avant que le panneau se replie automatiquement (désactivé si 0 ou nul)
     *
     */
    constructor(id, options){
        super(id);
        this.options = {...HtmlPanel.defaultOptions,...options};
        this.state.position = this.options.initialPosition;
        this.dispatch = d3.dispatch('position');
        this.timer=new d3.timeout( () => {}, 0);
        //Creation des divs
        this._outerContainer = d3.create('div').classed(HtmlPanel.type,true).classed('right',true);
        this._handle = this._outerContainer.append('div').classed('handle',true);
        this._innerContainer = this._outerContainer.append('div').classed('content',true);
        this._handle.on('click', (e) =>{
            if (this.state.position==='folded') this.unfold();
            else this.fold();
        });
    }


    get outerContainer(){
        return this._outerContainer;
    }

    get innerContainer(){
        return this._innerContainer;
    }

    appendTo(parent){
        super.appendTo(parent);
        this.parentContainer.style('overflow','hidden');
        this.resize();



        return this;
    }

    /**
     * Calcule les dimensions du panneau par rapport à l'élement parent, et le redimensionne
     * @returns {HtmlPanel}
     */
    resize(){
        const applyPercent= (value,percent) => {
            const p=parseFloat(percent);
            return value*p/100;
        }//Calcul dimensions parent
        const parentSize = this.parentContainer.node().getBoundingClientRect();
        this.size = {
            width: applyPercent(parentSize.width,this.options.width),
            height: applyPercent(parentSize.height,this.options.height)
        }//Dimensionnement du panel
        this.outerContainer
                .style('top',`${(parentSize.height-this.size.height)/2}px`)
                .style('width',`${this.size.width}px`)
                .style('height',`${this.size.height}px`);
        //Dimensionnement et positionnement poignée
        this.size.handle = applyPercent(this.size.width,this.options.handleWidth);
        this._handle
            .style('width',`${this.size.handle}px`)
            .style('height',`${this.size.height}px`);
        this._handle.append('span')
            .style('line-height',`${this.size.height}px`)
            .style('font-size',`${this.size.handle*.5}px`)
            .text('◀');
        //Dimensionnement et positionnement contenu
        this.size.content=this.size.width-this.size.handle;
        this._innerContainer
            .style('left',`${this.size.handle}px`)
            .style('width',`${this.size.width-this.size.handle}px`)
            .style('height',`${this.size.height}px`);
        //Position initiale
        if (this.options.initialPosition==='unfolded')
            this.outerContainer
                .classed('unfolded',true)
                .style('right','0px');
        else {
            this.outerContainer
                .classed('folded',true)
                .style('right',`-${this.size.content}px`);
        }
        return this;
    }

    /**
     * Replie le panneau
     * @param {Object} options              Options:
     * @param {Number} options.duration         Durée des transitions
     * @param {Number} options.delay            Délai des transitions
     * @returns {HtmlPanel}
     */
    fold(options={}){
        options={...this.options,...options};
        this.timer.stop();
        this.enqueue( () => new Promise((resolve, reject) => {

            this.outerContainer
                .transition()
                .duration(options.duration)
                .delay(options.delay)
                .style('right',`-${this.size.content}px`)
                .on('end', () => {
                    this.dispatch.call('position',this,{action: 'folded'});
                    this.state.position = 'folded';
                    this.outerContainer.classed('folded',true).classed('unfolded',false);
                    resolve(this);
                });

        }));
        return this;
    }

    /**
     * Déplie le panneau
     * @param {Object} options              Options:
     * @param {Number} options.duration         Durée des transitions
     * @param {Number} options.delay            Délai des transitions
     * @returns {HtmlPanel}
     */
    unfold(options={}){
        options={...this.options,...options};
        if (this.options.timer) this.timer.restart( this.fold.bind(this), this.options.timer);
        this.enqueue( () => new Promise((resolve, reject) => {
            this.outerContainer
                .transition()
                .duration(options.duration)
                .delay(options.delay)
                .style('right','0px')
                .on('end', ()=> {
                    this.dispatch.call('position',this,{action: 'unfolded'});
                    this.state.position = 'unfolded';
                    this.outerContainer.classed('unfolded',true).classed('folded',false);
                    resolve(this);
                });
        }));
        return this;
    }



}

export {HtmlPanel}