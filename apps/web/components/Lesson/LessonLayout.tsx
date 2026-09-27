'use client';
import { useState } from 'react';

const starterCode = [
  '#![cfg_attr(not(feature = "export-abi"), no_main)]',
  'extern crate alloc;',
  '',
  'use stylus_sdk::prelude::*;',
  'use alloc::string::String;',
  '',
  'sol_storage! {',
  '    #[entrypoint]',
  '    pub struct HelloWorld {',
  '        // TODO: add a String field called greeting',
  '    }',
  '}',
  '',
  '#[public]',
  'impl HelloWorld {',
  '    pub fn get_greeting(&self) -> String {',
  '        String::new()',
  '    }',
  '    pub fn set_greeting(&mut self, greeting: String) {',
  '        // TODO: store the greeting',
  '    }',
  '}',
].join('\n');

const solutionCode = [
  '#![cfg_attr(not(feature = "export-abi"), no_main)]',
  'extern crate alloc;',
  '',
  'use stylus_sdk::prelude::*;',
  'use alloc::string::String;',
  '',
  'sol_storage! {',
  '    #[entrypoint]',
  '    pub struct HelloWorld {',
  '        String greeting;',
  '    }',
  '}',
  '',
  '#[public]',
  'impl HelloWorld {',
  '    pub fn get_greeting(&self) -> String {',
  '        self.greeting.get_string()',
  '    }',
  '    pub fn set_greeting(&mut self, greeting: String) {',
  '        self.greeting.set_str(&greeting);',
  '    }',
  '}',
].join('\n');

const explanation = [
  '## Hello World with Arbitrum Stylus',
  '',
  'Stylus lets you write smart contracts in Rust compiled to WASM running on Arbitrum.',
  '',
  '### Structure of a Stylus contract',
  '',
  '1. Import the stylus_sdk crate',
  '2. Define storage with sol_storage! macro',
  '3. Add an impl block with your functions',
  '4. Use #[public] to expose functions',
  '',
  '### Your task',
  '',
  'Add a String field called greeting in sol_storage!',
  'Then implement get_greeting and set_greeting.',
].join('\n');

export function LessonLayout({ slug }: { slug: string }) {
  const [code, setCode] = useState(starterCode);
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState<string[]>([]);

  const checkCode = () => {
    const h: string[] = [];
    if (h.length === 0) { setCompleted(true); setHints([]); }
    else setHints(h);
  };

  return (
    <div className='min-h-screen bg-gray-950 text-white flex flex-col'>
      <div className='border-b border-gray-800 px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <a href='/learn' className='text-gray-400 hover:text-white text-sm'>← Back</a>
          <h1 className='font-bold'>Hello World Stylus</h1>
        </div>
        <span className='text-yellow-400 font-bold'>100 XP</span>
      </div>
      <div className='flex flex-1'>
        <div className='w-1/2 overflow-y-auto p-8 border-r border-gray-800'>
          {explanation.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} className='text-2xl font-bold mt-6 mb-4'>{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className='text-lg font-bold mt-4 mb-2'>{line.slice(4)}</h3>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className='text-gray-300 mb-2'>{line}</p>;
          })}
        </div>
        <div className='w-1/2 flex flex-col p-4 gap-4'>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className='flex-1 bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg border border-gray-700 resize-none focus:outline-none focus:border-purple-600'
            spellCheck={false}
          />
          {hints.length > 0 && (
            <div className='bg-yellow-900/30 border border-yellow-600 rounded p-4'>
              <p className='text-yellow-400 font-bold mb-2'>Hints</p>
              {hints.map((h, i) => <p key={i} className='text-yellow-200 text-sm'>→ {h}</p>)}
            </div>
          )}
          {completed && (
            <div className='bg-green-900/30 border border-green-600 rounded p-4 text-center'>
              <p className='text-green-400 font-bold text-lg'>Lesson completed! +100 XP</p>
            </div>
          )}
          <button onClick={checkCode} className='bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition'>
            Check my code
          </button>
        </div>
      </div>
    </div>
  );
}