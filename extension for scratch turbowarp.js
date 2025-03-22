class MiExtension {
    getInfo() {
        return {
            id: "miExtension",
            name: "Mi Extensión",
            blocks: [
                {
                    opcode: "sumar",
                    blockType: Scratch.BlockType.REPORTER,
                    text: "Sumar [A] + [B]",
                    arguments: {
                        A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
                        B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
                    }
                }
            ]
        };
    }

    sumar(args) {
        return args.A + args.B;
    }
}

Scratch.extensions.register(new MiExtension());
