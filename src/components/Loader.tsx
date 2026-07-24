import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 w-full h-full">
      <div className="flex items-center justify-center gap-2 h-16">
        <div className="loader-bar loader-bar-1 w-2.5 h-full rounded-full bg-gradient-to-b from-cyan-400 to-pink-500"></div>
        <div className="loader-bar loader-bar-2 w-2.5 h-full rounded-full bg-gradient-to-b from-cyan-400 to-pink-500"></div>
        <div className="loader-bar loader-bar-3 w-2.5 h-full rounded-full bg-gradient-to-b from-cyan-400 to-pink-500"></div>
        <div className="loader-bar loader-bar-4 w-2.5 h-full rounded-full bg-gradient-to-b from-cyan-400 to-pink-500"></div>
        <div className="loader-bar loader-bar-5 w-2.5 h-full rounded-full bg-gradient-to-b from-cyan-400 to-pink-500"></div>
      </div>
      <div className="text-[13px] font-extrabold tracking-[0.3em] text-slate-500 dark:text-slate-400 uppercase mt-2">
        Loading
      </div>
    </div>
  );
};

export default Loader;
