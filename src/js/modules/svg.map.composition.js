import * as d3Selection from 'd3-selection'
import * as d3Transition from 'd3-transition'
import * as d3Ease from 'd3-ease'
import * as d3Geo from 'd3-geo'
import * as d3Zoom from 'd3-zoom'
import {Svg} from "./svg.js"

const d3=Object.assign({},d3Selection,d3Geo,d3Zoom,d3Transition,d3Ease);

function * gradientGenerator(){
    let index = 0;
    while(true)
        yield `Gradient${index++}`;
}



class SvgMapComposition extends Svg{

    static type='SvgMapComposition';

    /**
     * Constructeur
     * @param id
     * @param size
     */
    constructor(id, size={}){
        super(id , size);
        this.projection = d3.geoMercator();
        this.path = d3.geoPath();
        this.defs=this.outerContainer.append('defs').lower();
        this.zoom = d3.zoom()
            .scaleExtent([1, 15])
            .translateExtent([[0, 0], [this.size.width, this.size.height]])
            .on('zoom', (e) =>this._handleZoom.call(this,e) );

    }

    zoomable(bool=true){
        if (bool)
            this.outerContainer.call(this.zoom);
        else
            this.outerContainer.on('.zoom', null);
        return this;
    }

    zoomCall() {
        this.outerContainer.call(this.zoom);
        return this;

    }

    _handleZoom(e) {
      //  console.log(e.transform);
        this.innerContainer.attr('transform', `translate(${this.size.margins.left+e.transform.x} ${this.size.margins.top+e.transform.y}) scale(${e.transform.k})`);
        const labels=this.innerContainer.selectAll('text.label')
        if (e.transform.k<4)  labels.classed('invisible',true)
        else labels.classed('invisible',false);
        labels.style('font-size',`${24/e.transform.k}px`);

    }

    zoomTo(selection){
        selection=[selection.node()];

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

        const bounds=getBoundaries(selection);

        const   hscale = this.size.effectiveWidth/(bounds.x2-bounds.x1),
                vscale = this.size.effectiveHeight/(bounds.y2-bounds.y1),
                scale = Math.min(hscale,vscale),
                offset = {  x: -bounds.x1 * scale + (this.size.effectiveWidth - (bounds.x2 - bounds.x1) * scale) / 2,
                            y: -bounds.y1 * scale + (this.size.effectiveHeight - (bounds.y2 - bounds.y1) * scale) / 2  },
                finalTransform = d3.zoomIdentity
                    .translate(offset.x,offset.y)
                    .scale(scale);
        this.outerContainer
            .transition()
            .delay(100)
            .duration(2000)
            .call(this.zoom.transform,finalTransform)
                .on('end', ()=> {
                    const newBounds=getBoundaries(selection);
                   // this.zoom.scaleExtent([finalTransform.k, finalTransform.k*4]);
                    this.zoom.scaleExtent([1, finalTransform.k*4]);
                        //.translateExtent([[newBounds.x1-this.size.margins.left,newBounds.y1],[newBounds.x2+this.size.margins.right,newBounds.y2]]);
                             //.translateExtent([[newBounds.x1,newBounds.y1],[newBounds.x2,newBounds.y2]]);
                    this.outerContainer.call(this.zoom,finalTransform);
                });

        //console.log(this.zoom.transform);


    }

    zoomOut(){
       // this.innerContainer.transition().ease(d3.easeCubic).duration(1000).attr('transform',`translate(0 0) scale(1)`);
    }

    fadeOutLayers(selector){
        this.container.selectAll(`g${selector}`)
            .transition()
            .duration(1000)
            .style('opacity',0)
            .on('end', (d,i,n) => d3.select(n[i]).style('display','none'));
        return this;
    }

    fadeInLayers(selector){
        this.container.selectAll(`g${selector}`)
            .style('display','auto')
            .transition()
            .duration(1000)
            .style('opacity',1);
        return this;
    }


    addGradient(values, options){
        const   id = options.id || gradientGenerator().next().value,
                g = (this.defs.select(`linearGradient#${id}`).empty()) ? this.defs.append('linearGradient') : this.defs.select(`linearGradient#${id}`);
        g.attr('id',id)
            .attr('x1',0)
            .attr('x2',1)
            .attr('y1',0)
            .attr('y2',1);
        g.selectAll('*')
            .remove();
        for (let i=0;i<values.length;i++){
            g.append('stop')
                .attr('offset', values[i][1])
                .attr('stop-color', values[i][0]);
            if (i<(values.length-1))
                g.append('stop')
                    .attr('offset', values[i][1]+.0001)
                    .attr('stop-color', values[i+1][0]);
        }
        return `url(#${id})`;
    }


}

export {SvgMapComposition}
