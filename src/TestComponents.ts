import { Component, CustomElement, html } from 'ce-decorators';
import { touchAndDrag, TouchAndDragEvent, TouchAndDragEventHandler } from './directives/touch-and-drag';

@Component({
    tag: 'test-component',
    style: `
    :host {
        position: absolute;
        top: 0px;
        left:0px;
        touch-action: none;
    }
    div {
        height: 100px;
        width: 100px;
        background: #f0f;
        touch-action: none;
    }
    `
})
export class TestComponent extends CustomElement implements TouchAndDragEventHandler {

    offset = {x: 0, y:0};

    renderToElement() {
        return this;
    }

    handleEvent(event: TouchAndDragEvent) {
        switch(event.type) {
            case 'start':
                this.offset.x  = event.clientX - this.getBoundingClientRect().left;
                this.offset.y  = event.clientY - this.getBoundingClientRect().top;
            case 'move':
            case 'cancel':
            case 'end':
            this.style.top = event.clientY - this.offset.y + 'px'
            this.style.left = event.clientX - this.offset.x + 'px'
            break;
            
        }
    }
    render() {
        return html`<div @=${touchAndDrag(this)}>test</div>`;
    }
}