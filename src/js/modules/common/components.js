class ComponentsRegister {
    constructor(){
        this.register=new Map();
    }

    has(id){
        return this.register.has(id);
    }
    get(id){
        return this.register.get(id);
    }
    add(component){
        this.register.set(component.id,component);
        return this;
    }
    delete(id){
        this.register.delete(id);
        return this;
    }
}
const componentsRegister=new ComponentsRegister();

const idGenerator = (function () {
    const index = {};
    return (component) => {
        const type = component.constructor.type || 'ID';
        if (!index.hasOwnProperty(type)) index[type]=0;
        return `${type}${index[type]++}`;
    }
}());


export {idGenerator,componentsRegister}