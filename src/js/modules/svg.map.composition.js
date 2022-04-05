import '../../style/svgMap.scss'

import * as d3Selection from 'd3-selection'
import * as d3Transition from 'd3-transition'
import * as d3Ease from 'd3-ease'
import * as d3Geo from 'd3-geo'
import * as d3Zoom from 'd3-zoom'
import * as d3Dispatch from 'd3-dispatch'
import {Svg} from "./svg.js"

const d3=Object.assign({},d3Selection,d3Geo,d3Zoom,d3Transition,d3Ease,d3Dispatch);



class SvgMapComposition extends Svg{

    static type='SvgMapComposition';
    static defaultOptions= { duration: 2000, delay:0, zoomable:true };

    /**
     * CONSTRUCTEUR
     * Objet SVG servant de contenur aux calques
     * @param {String} id                   Identifiant
     * @param {Object} size                 Dimensions du svg
     * @param {Number} size.width           Largeur
     * @param {Number} size.height          Hauteur
     * @param {Object} size.margins         Marges
     * @param {Object} options              Marges
     * @param {Number} options.duration     Durée des animations (zoom)
     * @param {Number} options.delay        Délai des animations (zoom)
     * @param {Boolean} options.zoomable    Zoom manuel autorisé ou non
     */
    constructor(id, size={}, options={}){
        super(id , size);
        this.options={...SvgMapComposition.defaultOptions,...options};
        this.defs=this.outerContainer.append('defs').lower();
        this.dispatch=d3.dispatch('zoom');
        this.projection = d3.geoMercator();
        this.path = d3.geoPath();
        this.zoom = d3.zoom()
            .scaleExtent([1, 15])
            .translateExtent([[0, 0], [this.size.width, this.size.height]])
            .on('zoom', (e) => this._handleZoom.call(this,e) );
        this._zoomable=this.options.zoomable;
    }


    /**
     * Méthode interne appelée lors du zoom
     * @param e
     * @private
     */
    _handleZoom(e) {
        if ( (e.sourceEvent && this._zoomable) || e.sourceEvent===null) {
            //Transformation
            this.innerContainer.attr('transform', `translate(${this.size.margins.left+e.transform.x} ${this.size.margins.top+e.transform.y}) scale(${e.transform.k})`);
            //Maintien de l'échelle et disparition des étiquettes
            const labels=this.innerContainer.selectAll('text.label')
            if (e.transform.k<4)  labels.classed('invisible',true)
            else labels.classed('invisible',false);
            labels.style('font-size',`${24/e.transform.k}px`);
            //Dispatch
            this.dispatch.call('zoom',this,{level:e.transform.k});
        }
    }

    /**
     * Zoome sur une sélection d'élements svg
     * @param {d3-selection} selection : selection d3
     */
    zoomTo(selection){
        selection=[selection.node()];
        this._zoomable=false;

        //Calcul du zoom

        const getBoundaries = (selection)=> {
            const bounds={x1:Infinity,x2:-Infinity,y1:Infinity,y2:-Infinity};
            for (let i=0;i<selection.length;i++) {
                bounds.x1=Math.min(selection[i].getBBox().x,bounds.x1);
                bounds.y1=Math.min(selection[i].getBBox().y,bounds.y1);
                bounds.x2=Math.max(selection[i].getBBox().x+selection[i].getBBox().width,bounds.x2);
                bounds.y2=Math.max(selection[i].getBBox().y+selection[i].getBBox().height,bounds.y2);
            }
            return bounds;
        }

        const   bounds=getBoundaries(selection),
                hscale = this.size.effectiveWidth/(bounds.x2-bounds.x1),
                vscale = this.size.effectiveHeight/(bounds.y2-bounds.y1),
                scale = Math.min(hscale,vscale),
                offset = {  x: -bounds.x1 * scale + (this.size.effectiveWidth - (bounds.x2 - bounds.x1) * scale) / 2,
                            y: -bounds.y1 * scale + (this.size.effectiveHeight - (bounds.y2 - bounds.y1) * scale) / 2  };
        const   finalTransform = d3.zoomIdentity
                    .translate(offset.x,offset.y)
                    .scale(scale);
        this.outerContainer
            .transition()
            .delay(this.options.delay)
            .duration(this.options.duration)
            .call(this.zoom.transform,finalTransform)
                .on('end', ()=> {
                    const newBounds=getBoundaries(selection);
                   // this.zoom.scaleExtent([finalTransform.k, finalTransform.k*4]);
                    this.zoom.scaleExtent([1, finalTransform.k*4]);
                        //.translateExtent([[newBounds.x1-this.size.margins.left,newBounds.y1],[newBounds.x2+this.size.margins.right,newBounds.y2]]);
                             //.translateExtent([[newBounds.x1,newBounds.y1],[newBounds.x2,newBounds.y2]]);
                    this.outerContainer.call(this.zoom,finalTransform);
                    this._zoomable=this.options.zoomable;
                });

        //console.log(this.zoom.transform);


    }

    zoomOut(){
        let finalTransform = d3.zoomIdentity
            .translate(0,0)
            .scale(1);
        this.outerContainer
            .transition()
            .delay(this.options.delay)
            .duration(this.options.duration)
            .call(this.zoom.transform,finalTransform)
            .on('end', ()=> {
                this.zoom.scaleExtent([1, finalTransform.k*4]);
                this.outerContainer.call(this.zoom,finalTransform);
            });
        return this;
    }

    fadeOutLayers(selector){
        this.container.selectAll(`g${selector}`)
            .transition()
            .duration(this.options.duration/2)
            .style('opacity',0)
            .on('end', (d,i,n) => d3.select(n[i]).style('display','none'));
        return this;
    }

    fadeInLayers(selector){
        this.container.selectAll(`g${selector}`)
            .style('display','auto')
            .transition()
            .duration(this.options.duration/2)
            .style('opacity',1);
        return this;
    }




}

export {SvgMapComposition}
