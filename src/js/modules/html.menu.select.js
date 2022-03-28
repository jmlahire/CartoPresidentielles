import * as d3Selection from 'd3-selection'
import * as d3Array from 'd3-array'
import * as d3Dispatch from 'd3-dispatch'
import {HtmlComponent} from "./html.component";

const d3=Object.assign({},d3Selection,d3Array,d3Dispatch);

class HtmlMenuSelect extends HtmlComponent{

    static type='HtmlMenuSelect';
    static options = { required:true, label:'' };

    constructor(id, options={ }){
        super(id);
        this.options = { ...HtmlMenuSelect.options, ...options };
        this.dispatch=d3.dispatch('change');
        this.container=d3.create('div')
            .attr('id',this.id)
            .classed(HtmlMenuSelect.type,true);
        this.container.append('label')
                                .attr('for',this.id)
                                .text(this.options.label);
        this.selectNode = this.container.append('select')
                                .attr('id',this.id)
                                .attr('name',this.id);
        if (this.options.placeHolder)
            this.selectNode.append('option')
                .attr('value','')
                .property('disabled',true)
                .property('selected',true)
                .property('hidden',true)
                .text(this.options.placeHolder);
    }

    data(data,options={ }){
        if (options.nested) this._dataGroups(data,options);
        this.selectNode
            .on('change', (e)=> {
                e.stopPropagation();
                this.dispatch.call('change',this, e.target.value);
            });
        return this;
    }


    _dataGroups(data,options){
        this.selectNode
            .selectAll('optgroup')
            .data(data, d=>d[0])
            .join(
                enter => {
                    enter.append('optgroup')
                            .attr('label', d=> d[0].toUpperCase())
                            .selectAll('option')
                                .data(d=>d[1])
                                .enter()
                                .append('option')
                                    .attr('value', d=>d[options.valueKey])
                                    .text( d=> d[options.nameKey])
                },
                update => update,
                exit => exit.remove()
            );
    }
}


export {HtmlMenuSelect}